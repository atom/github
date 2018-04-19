import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import StatusBar from '../views/status-bar';
import Panel from '../views/panel';
import PaneItem from '../views/pane-item';
import DockItem from '../views/dock-item';
import CloneDialog from '../views/clone-dialog';
import OpenIssueishDialog from '../views/open-issueish-dialog';
import InitDialog from '../views/init-dialog';
import CredentialDialog from '../views/credential-dialog';
import Commands, {Command} from '../views/commands';
import GithubTabController from './github-tab-controller';
import FilePatchController from './file-patch-controller';
import GitTabController from './git-tab-controller';
import StatusBarTileController from './status-bar-tile-controller';
import RepositoryConflictController from './repository-conflict-controller';
import GithubLoginModel from '../models/github-login-model';
import Conflict from '../models/conflicts/conflict';
import RefHolder from '../models/ref-holder';
import Switchboard from '../switchboard';
import {toNativePathSep, destroyFilePatchPaneItems, destroyEmptyFilePatchPaneItems} from '../helpers';
import {GitError} from '../git-shell-out-strategy';

function getPropsFromUri(uri) {
  // atom-github://file-patch/file.txt?workdir=/foo/bar/baz&stagingStatus=staged
  const {protocol, hostname, pathname, query} = url.parse(uri, true);
  if (protocol === 'atom-github:' && hostname === 'file-patch') {
    const filePath = toNativePathSep(pathname.slice(1));
    const {stagingStatus, workdir} = query;
    return {
      filePath: decodeURIComponent(filePath),
      workdir: decodeURIComponent(workdir),
      stagingStatus,
    };
  }
  return null;
}

export default class RootController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    deserializers: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    project: PropTypes.object.isRequired,
    confirm: PropTypes.func.isRequired,
    getRepositoryForWorkdir: PropTypes.func.isRequired,
    createRepositoryForProjectPath: PropTypes.func,
    cloneRepositoryForProjectPath: PropTypes.func,
    repository: PropTypes.object.isRequired,
    resolutionProgress: PropTypes.object.isRequired,
    statusBar: PropTypes.object,
    switchboard: PropTypes.instanceOf(Switchboard),
    startOpen: PropTypes.bool,
    gitTabStubItem: PropTypes.object,
    githubTabStubItem: PropTypes.object,
    destroyGitTabItem: PropTypes.func.isRequired,
    destroyGithubTabItem: PropTypes.func.isRequired,
    filePatchItems: PropTypes.array,
    removeFilePatchItem: PropTypes.func.isRequired,
    pipelineManager: PropTypes.object,
  }

  static defaultProps = {
    switchboard: new Switchboard(),
    startOpen: true,
  }

  constructor(props, context) {
    super(props, context);

    this.loginModel = GithubLoginModel.get();

    this.state = {
      cloneDialogActive: false,
      cloneDialogInProgress: false,
      initDialogActive: false,
      initDialogPath: null,
      initDialogResolve: null,
      credentialDialogQuery: null,
    };

    this.refGitTabController = new RefHolder();
    this.refGitHubTabController = new RefHolder();
    this.filePatchRefs = new Map();

    this.gitTabTracker = new TabTracker('git', {
      uri: 'atom-github://dock-item/git',
      getController: () => this.refGitTabController.get(),
      getWorkspace: () => this.props.workspace,
    });

    this.githubTabTracker = new TabTracker('github', {
      uri: 'atom-github://dock-item/github',
      getController: () => this.refGithubTabController.get(),
      getWorkspace: () => this.props.workspace,
    });

    this.subscription = new CompositeDisposable(
      this.props.repository.onMergeError(() => this.gitTabTracker.ensureVisible()),
    );
  }

  render() {
    const devMode = global.atom && global.atom.inDevMode();

    return (
      <div>
        <Commands registry={this.props.commandRegistry} target="atom-workspace">
          {devMode && <Command command="github:install-react-dev-tools" callback={this.installReactDevTools} />}
          <Command command="github:logout" callback={this.clearGithubToken} />
          <Command command="github:show-waterfall-diagnostics" callback={this.showWaterfallDiagnostics} />
          <Command command="github:open-issue-or-pull-request" callback={this.showOpenIssueishDialog} />
          <Command command="github:toggle-git-tab" callback={this.gitTabTracker.toggle} />
          <Command command="github:toggle-git-tab-focus" callback={this.gitTabTracker.toggleFocus} />
          <Command command="github:toggle-github-tab" callback={this.githubTabTracker.toggle} />
          <Command command="github:toggle-github-tab-focus" callback={this.githubTabTracker.toggleFocus} />
          <Command command="github:clone" callback={this.openCloneDialog} />
          <Command
            command="github:view-unstaged-changes-for-current-file"
            callback={this.viewUnstagedChangesForCurrentFile}
          />
          <Command
            command="github:view-staged-changes-for-current-file"
            callback={this.viewStagedChangesForCurrentFile}
          />
          <Command
            command="github:close-all-diff-views"
            callback={this.destroyFilePatchPaneItems}
          />
          <Command
            command="github:close-empty-diff-views"
            callback={this.destroyEmptyFilePatchPaneItems}
          />
        </Commands>
        {this.renderStatusBarTile()}
        {this.renderPanels()}
        {this.renderInitDialog()}
        {this.renderCloneDialog()}
        {this.renderCredentialDialog()}
        {this.renderOpenIssueishDialog()}
        {this.renderRepositoryConflictController()}
        {this.renderFilePatches()}
      </div>
    );
  }

  renderStatusBarTile() {
    return (
      <StatusBar
        statusBar={this.props.statusBar}
        onConsumeStatusBar={sb => this.onConsumeStatusBar(sb)}
        className="github-StatusBarTileController">
        <StatusBarTileController
          pipelineManager={this.props.pipelineManager}
          workspace={this.props.workspace}
          repository={this.props.repository}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          tooltips={this.props.tooltips}
          confirm={this.props.confirm}
          toggleGitTab={this.gitTabTracker.toggle}
          ensureGitTabVisible={this.gitTabTracker.ensureVisible}
        />
      </StatusBar>
    );
  }

  renderPanels() {
    const gitTab = this.props.gitTabStubItem && (
      <DockItem
        workspace={this.props.workspace}
        onDidCloseItem={this.props.destroyGitTabItem}
        stubItem={this.props.gitTabStubItem}
        itemHolder={this.refGitTabController}
        activate={this.props.startOpen}>
        <GitTabController
          ref={this.refGitTabController.setter}
          workspace={this.props.workspace}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          tooltips={this.props.tooltips}
          grammars={this.props.grammars}
          project={this.props.project}
          confirm={this.props.confirm}
          config={this.props.config}
          repository={this.props.repository}
          initializeRepo={this.initializeRepo}
          resolutionProgress={this.props.resolutionProgress}
          ensureGitTab={this.gitTabTracker.ensureVisible}
          openFiles={this.openFiles}
          discardWorkDirChangesForPaths={this.discardWorkDirChangesForPaths}
          undoLastDiscard={this.undoLastDiscard}
          refreshResolutionProgress={this.refreshResolutionProgress}
        />
      </DockItem>
    );

    const githubTab = this.props.githubTabStubItem && (
      <DockItem
        workspace={this.props.workspace}
        onDidCloseItem={this.props.destroyGithubTabItem}
        stubItem={this.props.githubTabStubItem}
        itemHolder={this.refGitHubTabController}>
        <GithubTabController
          ref={this.refGitHubTabController.setter}
          repository={this.props.repository}
          loginModel={this.loginModel}
        />
      </DockItem>
    );

    return <div>{gitTab}{githubTab}</div>;
  }

  renderInitDialog() {
    if (!this.state.initDialogActive) {
      return null;
    }

    return (
      <Panel workspace={this.props.workspace} location="modal">
        <InitDialog
          config={this.props.config}
          commandRegistry={this.props.commandRegistry}
          initPath={this.state.initDialogPath}
          didAccept={this.acceptInit}
          didCancel={this.cancelInit}
        />
      </Panel>
    );
  }

  renderCloneDialog() {
    if (!this.state.cloneDialogActive) {
      return null;
    }

    return (
      <Panel workspace={this.props.workspace} location="modal">
        <CloneDialog
          config={this.props.config}
          commandRegistry={this.props.commandRegistry}
          didAccept={this.acceptClone}
          didCancel={this.cancelClone}
          inProgress={this.state.cloneDialogInProgress}
        />
      </Panel>
    );
  }

  renderOpenIssueishDialog() {
    if (!this.state.openIssueishDialogActive) {
      return null;
    }

    return (
      <Panel workspace={this.props.workspace} location="modal">
        <OpenIssueishDialog
          commandRegistry={this.props.commandRegistry}
          didAccept={this.acceptOpenIssueish}
          didCancel={this.cancelOpenIssueish}
        />
      </Panel>
    );
  }

  renderCredentialDialog() {
    if (this.state.credentialDialogQuery === null) {
      return null;
    }

    return (
      <Panel workspace={this.props.workspace} location="modal">
        <CredentialDialog commandRegistry={this.props.commandRegistry} {...this.state.credentialDialogQuery} />
      </Panel>
    );
  }

  renderRepositoryConflictController() {
    if (!this.props.repository) {
      return null;
    }

    return (
      <RepositoryConflictController
        workspace={this.props.workspace}
        config={this.props.config}
        repository={this.props.repository}
        resolutionProgress={this.props.resolutionProgress}
        refreshResolutionProgress={this.refreshResolutionProgress}
        commandRegistry={this.props.commandRegistry}
      />
    );
  }

  renderFilePatches() {
    return this.props.filePatchItems.map(item => {
      const {filePath, stagingStatus, workdir} = getPropsFromUri(item.uri);

      let refHolder = this.filePatchRefs.get(item.uri);
      if (!refHolder) {
        refHolder = new RefHolder();
        this.filePatchRefs.set(refHolder);
      }

      return (
        <PaneItem
          key={item.key}
          workspace={this.props.workspace}
          onDidCloseItem={this.removeFilePatchItem}
          stubItem={item}
          itemHolder={refHolder}>
          <FilePatchController
            ref={refHolder.setter}
            deserializers={this.props.deserializers}
            commandRegistry={this.props.commandRegistry}
            tooltips={this.props.tooltips}
            switchboard={this.props.switchboard}
            getRepositoryForWorkdir={this.getRepositoryForWorkdir}
            workingDirectoryPath={workdir}
            filePath={filePath}
            initialStagingStatus={stagingStatus}
            didSurfaceFile={this.surfaceFromFileAtPath}
            didDiveIntoFilePath={this.diveIntoFilePatchForPath}
            quietlySelectItem={this.quietlySelectItem}
            openFiles={this.openFiles}
            discardLines={this.discardLines}
            undoLastDiscard={this.undoLastDiscard}
            uri={item.uri}
          />
        </PaneItem>
      );
    });
  }

  @autobind
  installReactDevTools() {
    // Prevent electron-link from attempting to descend into electron-devtools-installer, which is not available
    // when we're bundled in Atom.
    const devToolsName = 'electron-devtools-installer';
    const devTools = require(devToolsName);
    devTools.default(devTools.REACT_DEVELOPER_TOOLS);
  }

  @autobind
  getRepositoryForWorkdir(workdir) {
    return this.props.getRepositoryForWorkdir(workdir);
  }

  @autobind
  removeFilePatchItem(item) {
    return this.props.removeFilePatchItem(item);
  }

  componentWillUnmount() {
    this.subscription.dispose();
  }

  componentDidUpdate() {
    this.subscription.dispose();
    this.subscription = new CompositeDisposable(
      this.props.repository.onMergeError(() => this.gitTabTracker.ensureVisible()),
    );

    const existingURIs = new Set(this.props.filePatchItems.map(item => item.uri));
    const retainedURIs = [...this.filePatchRefs.keys()];
    for (const uri of retainedURIs) {
      if (!existingURIs.has(uri)) {
        this.filePatchRefs.delete(uri);
      }
    }
  }

  onConsumeStatusBar(statusBar) {
    if (statusBar.disableGitInfoTile) {
      statusBar.disableGitInfoTile();
    }
  }

  @autobind
  clearGithubToken() {
    return this.loginModel.removeToken('https://api.github.com');
  }

  @autobind
  initializeRepo(initDialogPath) {
    if (this.state.initDialogActive) {
      return null;
    }

    return new Promise(resolve => {
      this.setState({initDialogActive: true, initDialogPath, initDialogResolve: resolve});
    });
  }

  @autobind
  showOpenIssueishDialog() {
    this.setState({openIssueishDialogActive: true});
  }

  @autobind
  showWaterfallDiagnostics() {
    this.props.workspace.open('atom-github://debug/timings');
  }

  @autobind
  async acceptClone(remoteUrl, projectPath) {
    this.setState({cloneDialogInProgress: true});
    try {
      await this.props.cloneRepositoryForProjectPath(remoteUrl, projectPath);
    } catch (e) {
      this.props.notificationManager.addError(
        `Unable to clone ${remoteUrl}`,
        {detail: e.stdErr, dismissable: true},
      );
    } finally {
      this.setState({cloneDialogInProgress: false, cloneDialogActive: false});
    }
  }

  @autobind
  cancelClone() {
    this.setState({cloneDialogActive: false});
  }

  @autobind
  async acceptInit(projectPath) {
    try {
      await this.props.createRepositoryForProjectPath(projectPath);
      if (this.state.initDialogResolve) { this.state.initDialogResolve(projectPath); }
    } catch (e) {
      this.props.notificationManager.addError(
        `Unable to initialize git repository in ${projectPath}`,
        {detail: e.stdErr, dismissable: true},
      );
    } finally {
      this.setState({initDialogActive: false, initDialogPath: null, initDialogResolve: null});
    }
  }

  @autobind
  cancelInit() {
    if (this.state.initDialogResolve) { this.state.initDialogResolve(false); }
    this.setState({initDialogActive: false, initDialogPath: null, initDialogResolve: null});
  }

  @autobind
  acceptOpenIssueish({repoOwner, repoName, issueishNumber}) {
    const uri = `atom-github://issueish/https://api.github.com/${repoOwner}/${repoName}/${issueishNumber}`;
    this.setState({openIssueishDialogActive: false});
    this.props.workspace.open(uri);
  }

  @autobind
  cancelOpenIssueish() {
    this.setState({openIssueishDialogActive: false});
  }

  @autobind
  surfaceFromFileAtPath(filePath, stagingStatus) {
    this.refGitTabController.map(c => {
      return c.focusAndSelectStagingItem(filePath, stagingStatus);
    });
  }

  @autobind
  destroyFilePatchPaneItems() {
    destroyFilePatchPaneItems({onlyStaged: false}, this.props.workspace);
  }

  @autobind
  destroyEmptyFilePatchPaneItems() {
    destroyEmptyFilePatchPaneItems(this.props.workspace);
  }

  @autobind
  openCloneDialog() {
    this.setState({cloneDialogActive: true});
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    return this.refGitTabController.map(c => {
      return c.quietlySelectItem(filePath, stagingStatus);
    });
  }

  async viewChangesForCurrentFile(stagingStatus) {
    const editor = this.props.workspace.getActiveTextEditor();
    const absFilePath = await fs.realpath(editor.getPath());
    const repoPath = this.props.repository.getWorkingDirectoryPath();
    if (repoPath === null) {
      const [projectPath] = this.props.project.relativizePath(editor.getPath());
      const notification = this.props.notificationManager.addInfo(
        "Hmm, there's nothing to compare this file to",
        {
          description: 'You can create a Git repository to track changes to the files in your project.',
          dismissable: true,
          buttons: [{
            className: 'btn btn-primary',
            text: 'Create a repository now',
            onDidClick: async () => {
              notification.dismiss();
              const createdPath = await this.initializeRepo(projectPath);
              // If the user confirmed repository creation for this project path,
              // retry the operation that got them here in the first place
              if (createdPath === projectPath) { this.viewChangesForCurrentFile(stagingStatus); }
            },
          }],
        },
      );
      return;
    }
    if (absFilePath.startsWith(repoPath)) {
      const filePath = absFilePath.slice(repoPath.length + 1);
      this.quietlySelectItem(filePath, stagingStatus);
      const splitDirection = this.props.config.get('github.viewChangesForCurrentFileDiffPaneSplitDirection');
      const pane = this.props.workspace.getActivePane();
      if (splitDirection === 'right') {
        pane.splitRight();
      } else if (splitDirection === 'down') {
        pane.splitDown();
      }
      const lineNum = editor.getCursorBufferPosition().row + 1;
      const filePatchItem = await this.props.workspace.open(
        `atom-github://file-patch/${filePath}?workdir=${repoPath}&stagingStatus=${stagingStatus}`,
        {pending: true, activatePane: true, activateItem: true},
      );
      await filePatchItem.getRealItemPromise();
      await filePatchItem.getFilePatchLoadedPromise();
      filePatchItem.goToDiffLine(lineNum);
      filePatchItem.focus();
    } else {
      throw new Error(`${absFilePath} does not belong to repo ${repoPath}`);
    }
  }

  @autobind
  viewUnstagedChangesForCurrentFile() {
    this.viewChangesForCurrentFile('unstaged');
  }

  @autobind
  viewStagedChangesForCurrentFile() {
    this.viewChangesForCurrentFile('staged');
  }

  @autobind
  openFiles(filePaths, repository = this.props.repository) {
    return Promise.all(filePaths.map(filePath => {
      const absolutePath = path.join(repository.getWorkingDirectoryPath(), filePath);
      return this.props.workspace.open(absolutePath, {pending: filePaths.length === 1});
    }));
  }

  @autobind
  getUnsavedFiles(filePaths, workdirPath) {
    const isModifiedByPath = new Map();
    this.props.workspace.getTextEditors().forEach(editor => {
      isModifiedByPath.set(editor.getPath(), editor.isModified());
    });
    return filePaths.filter(filePath => {
      const absFilePath = path.join(workdirPath, filePath);
      return isModifiedByPath.get(absFilePath);
    });
  }

  @autobind
  ensureNoUnsavedFiles(filePaths, message, workdirPath = this.props.repository.getWorkingDirectoryPath()) {
    const unsavedFiles = this.getUnsavedFiles(filePaths, workdirPath).map(filePath => `\`${filePath}\``).join('<br>');
    if (unsavedFiles.length) {
      this.props.notificationManager.addError(
        message,
        {
          description: `You have unsaved changes in:<br>${unsavedFiles}.`,
          dismissable: true,
        },
      );
      return false;
    } else {
      return true;
    }
  }

  @autobind
  async discardWorkDirChangesForPaths(filePaths) {
    const destructiveAction = () => {
      return this.props.repository.discardWorkDirChangesForPaths(filePaths);
    };
    return await this.props.repository.storeBeforeAndAfterBlobs(
      filePaths,
      () => this.ensureNoUnsavedFiles(filePaths, 'Cannot discard changes in selected files.'),
      destructiveAction,
    );
  }

  @autobind
  async discardLines(filePatch, lines, repository = this.props.repository) {
    const filePath = filePatch.getPath();
    const destructiveAction = async () => {
      const discardFilePatch = filePatch.getUnstagePatchForLines(lines);
      await repository.applyPatchToWorkdir(discardFilePatch);
    };
    return await repository.storeBeforeAndAfterBlobs(
      [filePath],
      () => this.ensureNoUnsavedFiles([filePath], 'Cannot discard lines.', repository.getWorkingDirectoryPath()),
      destructiveAction,
      filePath,
    );
  }

  getFilePathsForLastDiscard(partialDiscardFilePath = null) {
    let lastSnapshots = this.props.repository.getLastHistorySnapshots(partialDiscardFilePath);
    if (partialDiscardFilePath) {
      lastSnapshots = lastSnapshots ? [lastSnapshots] : [];
    }
    return lastSnapshots.map(snapshot => snapshot.filePath);
  }

  @autobind
  async undoLastDiscard(partialDiscardFilePath = null, repository = this.props.repository) {
    const filePaths = this.getFilePathsForLastDiscard(partialDiscardFilePath);
    try {
      const results = await repository.restoreLastDiscardInTempFiles(
        () => this.ensureNoUnsavedFiles(filePaths, 'Cannot undo last discard.'),
        partialDiscardFilePath,
      );
      if (results.length === 0) { return; }
      await this.proceedOrPromptBasedOnResults(results, partialDiscardFilePath);
    } catch (e) {
      if (e instanceof GitError && e.stdErr.match(/fatal: Not a valid object name/)) {
        this.cleanUpHistoryForFilePaths(filePaths, partialDiscardFilePath);
      } else {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }

  async proceedOrPromptBasedOnResults(results, partialDiscardFilePath = null) {
    const conflicts = results.filter(({conflict}) => conflict);
    if (conflicts.length === 0) {
      await this.proceedWithLastDiscardUndo(results, partialDiscardFilePath);
    } else {
      await this.promptAboutConflicts(results, conflicts, partialDiscardFilePath);
    }
  }

  async promptAboutConflicts(results, conflicts, partialDiscardFilePath = null) {
    const conflictedFiles = conflicts.map(({filePath}) => `\t${filePath}`).join('\n');
    const choice = this.props.confirm({
      message: 'Undoing will result in conflicts...',
      detailedMessage: `for the following files:\n${conflictedFiles}\n` +
        'Would you like to apply the changes with merge conflict markers, ' +
        'or open the text with merge conflict markers in a new file?',
      buttons: ['Merge with conflict markers', 'Open in new file', 'Cancel undo'],
    });
    if (choice === 0) {
      await this.proceedWithLastDiscardUndo(results, partialDiscardFilePath);
    } else if (choice === 1) {
      await this.openConflictsInNewEditors(conflicts.map(({resultPath}) => resultPath));
    }
  }

  cleanUpHistoryForFilePaths(filePaths, partialDiscardFilePath = null) {
    this.props.repository.clearDiscardHistory(partialDiscardFilePath);
    const filePathsStr = filePaths.map(filePath => `\`${filePath}\``).join('<br>');
    this.props.notificationManager.addError(
      'Discard history has expired.',
      {
        description: `Cannot undo discard for<br>${filePathsStr}<br>Stale discard history has been deleted.`,
        dismissable: true,
      },
    );
  }

  async proceedWithLastDiscardUndo(results, partialDiscardFilePath = null) {
    const promises = results.map(async result => {
      const {filePath, resultPath, deleted, conflict, theirsSha, commonBaseSha, currentSha} = result;
      const absFilePath = path.join(this.props.repository.getWorkingDirectoryPath(), filePath);
      if (deleted && resultPath === null) {
        await fs.remove(absFilePath);
      } else {
        await fs.copy(resultPath, absFilePath);
      }
      if (conflict) {
        await this.props.repository.writeMergeConflictToIndex(filePath, commonBaseSha, currentSha, theirsSha);
      }
    });
    await Promise.all(promises);
    await this.props.repository.popDiscardHistory(partialDiscardFilePath);
  }

  async openConflictsInNewEditors(resultPaths) {
    const editorPromises = resultPaths.map(resultPath => {
      return this.props.workspace.open(resultPath);
    });
    return await Promise.all(editorPromises);
  }

  /*
   * Asynchronously count the conflict markers present in a file specified by full path.
   */
  @autobind
  refreshResolutionProgress(fullPath) {
    const readStream = fs.createReadStream(fullPath, {encoding: 'utf8'});
    return new Promise(resolve => {
      Conflict.countFromStream(readStream).then(count => {
        this.props.resolutionProgress.reportMarkerCount(fullPath, count);
      });
    });
  }

  /*
   * Display the credential entry dialog. Return a Promise that will resolve with the provided credentials on accept
   * or reject on cancel.
   */
  promptForCredentials(query) {
    return new Promise((resolve, reject) => {
      this.setState({
        credentialDialogQuery: {
          ...query,
          onSubmit: response => this.setState({credentialDialogQuery: null}, () => resolve(response)),
          onCancel: () => this.setState({credentialDialogQuery: null}, reject),
        },
      });
    });
  }
}

class TabTracker {
  constructor(name, {getController, getWorkspace, uri}) {
    this.name = name;

    this.getWorkspace = getWorkspace;
    this.getController = getController;
    this.uri = uri;
  }

  getControllerComponent() {
    const controller = this.getController();

    if (controller.getWrappedComponentInstance) {
      return controller.getWrappedComponentInstance();
    }

    if (controller.getWrappedComponent) {
      return controller.getWrappedComponent();
    }

    return controller;
  }

  @autobind
  async toggle() {
    const focusToRestore = document.activeElement;
    let shouldRestoreFocus = false;

    // Rendered => the dock item is being rendered, whether or not the dock is visible or the item
    //   is visible within its dock.
    // Visible => the item is active and the dock item is active within its dock.
    const wasRendered = this.isRendered();
    const wasVisible = this.isVisible();

    if (!wasRendered || !wasVisible) {
      // Not rendered, or rendered but not an active item in a visible dock.
      await this.reveal();
      shouldRestoreFocus = true;
    } else {
      // Rendered and an active item within a visible dock.
      await this.hide();
      shouldRestoreFocus = false;
    }

    if (shouldRestoreFocus) {
      process.nextTick(() => focusToRestore.focus());
    }
  }

  @autobind
  async toggleFocus() {
    await this.ensureVisible();

    if (this.hasFocus()) {
      let workspace = this.getWorkspace();
      if (workspace.getCenter) {
        workspace = workspace.getCenter();
      }
      workspace.getActivePane().activate();
    } else {
      this.focus();
    }
  }

  @autobind
  async ensureVisible() {
    if (!this.isVisible()) {
      await this.reveal();
      return true;
    }
    return false;
  }

  reveal() {
    return this.getWorkspace().open(this.uri, {searchAllPanes: true, activateItem: true, activatePane: true});
  }

  hide() {
    return this.getWorkspace().hide(this.uri);
  }

  focus() {
    this.getControllerComponent().restoreFocus();
  }

  isRendered() {
    return !!this.getWorkspace().paneForURI(this.uri);
  }

  isVisible() {
    const workspace = this.getWorkspace();
    return workspace.getPaneContainers()
      .filter(container => container === workspace.getCenter() || container.isVisible())
      .some(container => container.getPanes().some(pane => {
        const item = pane.getActiveItem();
        return item && item.getURI && item.getURI() === this.uri;
      }));
  }

  hasFocus() {
    return this.getControllerComponent().hasFocus();
  }
}
