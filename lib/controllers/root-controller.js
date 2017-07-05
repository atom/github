import fs from 'fs';
import path from 'path';

import {File} from 'atom';
import {CompositeDisposable} from 'event-kit';

import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import EtchWrapper from '../views/etch-wrapper';
import StatusBar from '../views/status-bar';
import Panel from '../views/panel';
import DockItem from '../views/dock-item';
import Resizer from '../views/resizer';
import Tabs from '../views/tabs';
import CloneDialog from '../views/clone-dialog';
import OpenIssueishDialog from '../views/open-issueish-dialog';
import InitDialog from '../views/init-dialog';
import CredentialDialog from '../views/credential-dialog';
import Commands, {Command} from '../views/commands';
import GithubTabController from './github-tab-controller';
import GitTabController from './git-tab-controller';
import StatusBarTileController from './status-bar-tile-controller';
import RepositoryConflictController from './repository-conflict-controller';
import FilePatchPaneItem from '../atom-items/file-patch-pane-item';
import ModelStateRegistry from '../models/model-state-registry';
import Conflict from '../models/conflicts/conflict';
import Switchboard from '../switchboard';
import {copyFile, deleteFileOrFolder} from '../helpers';
import {GitError} from '../git-shell-out-strategy';

export default class RootController extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    grammars: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    confirm: PropTypes.func.isRequired,
    activeWorkingDirectory: PropTypes.string,
    createRepositoryForProjectPath: PropTypes.func,
    cloneRepositoryForProjectPath: PropTypes.func,
    repository: PropTypes.object.isRequired,
    resolutionProgress: PropTypes.object.isRequired,
    statusBar: PropTypes.object,
    switchboard: PropTypes.instanceOf(Switchboard),
    savedState: PropTypes.object,
    useLegacyPanels: PropTypes.bool,
    startOpen: React.PropTypes.bool,
  }

  static defaultProps = {
    switchboard: new Switchboard(),
    savedState: {},
    useLegacyPanels: false,
    startOpen: true,
  }

  serialize() {
    return {
      gitTabActive: this.state.gitTabActive,
      githubTabActive: this.state.githubTabActive,
      panelSize: this.state.panelSize,
      activeTab: this.state.activeTab,
    };
  }

  constructor(props, context) {
    super(props, context);

    const renderGitTab = props.startOpen ||
      (props.savedState.gitTabActive === undefined ?
        !this.props.useLegacyPanels : this.props.savedState.gitTabActive);
    const renderGitHubTab = props.startOpen ||
      (props.savedState.githubTabActive === undefined ?
        !this.props.useLegacyPanels : this.props.savedState.githubTabActive);

    this.state = {
      amending: false,
      gitTabActive: renderGitTab,
      githubTabActive: renderGitHubTab,
      panelSize: props.savedState.panelSize || 400,
      activeTab: props.savedState.activeTab || 0,
      cloneDialogActive: false,
      cloneDialogInProgress: false,
      initDialogActive: false,
      credentialDialogQuery: null,
    };

    this.repositoryStateRegistry = new ModelStateRegistry(RootController, {
      save: () => {
        return {amending: this.state.amending};
      },
      restore: (state = {}) => {
        this.setState({amending: !!state.amending});
      },
    });

    this.subscriptions = new CompositeDisposable();

    this.gitTabTracker = new TabTracker('git', {
      useLegacyPanels: this.props.useLegacyPanels,
      getState: () => this.state.gitTabActive,
      setState: (value, {activateTab}, callback) => {
        const newState = {gitTabActive: value};
        if (activateTab) { newState.activeTab = 0; }
        this.setState(newState, callback);
      },
      getController: () => this.gitTabController,
      getDockItem: () => this.gitDockItem,
      getWorkspace: () => this.props.workspace,
    });

    this.githubTabTracker = new TabTracker('github', {
      useLegacyPanels: this.props.useLegacyPanels,
      getState: () => this.state.githubTabActive,
      setState: (value, {activateTab}, callback) => {
        const newState = {githubTabActive: value};
        if (activateTab) { newState.activeTab = 1; }
        this.setState(newState, callback);
      },
      getController: () => this.githubTabController,
      getDockItem: () => this.githubDockItem,
      getWorkspace: () => this.props.workspace,
    });
  }

  componentWillMount() {
    this.repositoryStateRegistry.setModel(this.props.repository);
  }

  componentWillReceiveProps(newProps) {
    this.repositoryStateRegistry.setModel(newProps.repository);

    this.gitTabTracker.useLegacyPanels = newProps.useLegacyPanels;
    this.githubTabTracker.useLegacyPanels = newProps.useLegacyPanels;
  }

  render() {
    return (
      <div>
        <Commands registry={this.props.commandRegistry} target="atom-workspace">
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
        </Commands>
        {this.renderStatusBarTile()}
        {this.renderPanels()}
        {this.renderInitDialog()}
        {this.renderCloneDialog()}
        {this.renderCredentialDialog()}
        {this.renderOpenIssueishDialog()}
        {this.renderRepositoryConflictController()}
      </div>
    );
  }

  renderStatusBarTile() {
    return (
      <StatusBar statusBar={this.props.statusBar} onConsumeStatusBar={sb => this.onConsumeStatusBar(sb)}>
        <StatusBarTileController
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
    if (!this.props.useLegacyPanels) {
      const gitTab = this.state.gitTabActive && (
        <DockItem
          ref={c => { this.gitDockItem = c; }}
          workspace={this.props.workspace}
          getItem={({subtree}) => subtree.getWrappedComponent()}
          onDidCloseItem={() => this.setState({gitTabActive: false})}
          stubItemSelector="git-tab-controller"
          activate={this.props.startOpen}>
          <EtchWrapper
            ref={c => { this.gitTabController = c; }}
            className="github-PanelEtchWrapper"
            reattachDomNode={false}>
            <GitTabController
              workspace={this.props.workspace}
              commandRegistry={this.props.commandRegistry}
              notificationManager={this.props.notificationManager}
              grammars={this.props.grammars}
              confirm={this.props.confirm}
              repository={this.props.repository}
              initializeRepo={this.initializeRepo}
              resolutionProgress={this.props.resolutionProgress}
              isAmending={this.state.amending}
              didSelectMergeConflictFile={this.showMergeConflictFileForPath}
              didDiveIntoMergeConflictPath={this.diveIntoMergeConflictFileForPath}
              didChangeAmending={this.didChangeAmending}
              ensureGitTab={this.gitTabTracker.ensureVisible}
              openFiles={this.openFiles}
              discardWorkDirChangesForPaths={this.discardWorkDirChangesForPaths}
              undoLastDiscard={this.undoLastDiscard}
              refreshResolutionProgress={this.refreshResolutionProgress}
            />
          </EtchWrapper>
        </DockItem>
      );

      const githubTab = this.state.githubTabActive && (
        <DockItem
          ref={c => { this.githubDockItem = c; }}
          workspace={this.props.workspace}
          onDidCloseItem={() => this.setState({githubTabActive: false})}
          stubItemSelector="github-tab-controller">
          <GithubTabController
            ref={c => { this.githubTabController = c; }}
            repository={this.props.repository}
          />
        </DockItem>
      );

      return <div>{gitTab}{githubTab}</div>;
    }

    return (
      <Panel
        workspace={this.props.workspace}
        location="right"
        onDidClosePanel={() => this.setState({gitTabActive: false, githubTabActive: false})}
        visible={!!this.state.gitTabActive || !!this.state.githubTabActive}>
        <Resizer
          size={this.state.panelSize}
          onChange={this.handlePanelResize}
          className="github-PanelResizer">
          <Tabs activeIndex={this.state.activeTab} onChange={this.handleChangeTab} className="sidebar-tabs">
            <Tabs.Panel title="Git">
              <EtchWrapper
                ref={c => { this.gitTabController = c; }}
                className="github-PanelEtchWrapper"
                reattachDomNode={false}>
                <GitTabController
                  workspace={this.props.workspace}
                  commandRegistry={this.props.commandRegistry}
                  notificationManager={this.props.notificationManager}
                  repository={this.props.repository}
                  initializeRepo={this.initializeRepo}
                  resolutionProgress={this.props.resolutionProgress}
                  isAmending={this.state.amending}
                  didSelectMergeConflictFile={this.showMergeConflictFileForPath}
                  didDiveIntoMergeConflictPath={this.diveIntoMergeConflictFileForPath}
                  didChangeAmending={this.didChangeAmending}
                  ensureGitTab={this.gitTabTracker.ensureVisible}
                  openFiles={this.openFiles}
                  discardWorkDirChangesForPaths={this.discardWorkDirChangesForPaths}
                  undoLastDiscard={this.undoLastDiscard}
                  refreshResolutionProgress={this.refreshResolutionProgress}
                />
              </EtchWrapper>
            </Tabs.Panel>
            <Tabs.Panel title="GitHub (preview)">
              <GithubTabController
                ref={c => { this.githubTabController = c; }}
                repository={this.props.repository}
              />
            </Tabs.Panel>
          </Tabs>
        </Resizer>
      </Panel>
    );
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
        repository={this.props.repository}
        resolutionProgress={this.props.resolutionProgress}
        refreshResolutionProgress={this.refreshResolutionProgress}
        commandRegistry={this.props.commandRegistry}
      />
    );
  }

  componentWillUnmount() {
    this.repositoryStateRegistry.save();
    this.subscriptions.dispose();
  }

  onConsumeStatusBar(statusBar) {
    if (statusBar.disableGitInfoTile) {
      statusBar.disableGitInfoTile();
    }
  }

  @autobind
  async initializeRepo() {
    if (this.props.activeWorkingDirectory) {
      await this.acceptInit(this.props.activeWorkingDirectory);
      return;
    }

    this.setState({initDialogActive: true});
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
    } catch (e) {
      this.props.notificationManager.addError(
        `Unable to initialize git repository in ${projectPath}`,
        {detail: e.stdErr, dismissable: true},
      );
    } finally {
      this.setState({initDialogActive: false});
    }
  }

  @autobind
  cancelInit() {
    this.setState({initDialogActive: false});
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
    if (this.gitTabController) {
      this.gitTabController.getWrappedComponent().focusAndSelectStagingItem(filePath, stagingStatus);
    }
  }

  @autobind
  async showMergeConflictFileForPath(relativeFilePath, {focus} = {}) {
    const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), relativeFilePath);
    if (await new File(absolutePath).exists()) {
      return this.props.workspace.open(absolutePath, {activatePane: Boolean(focus), pending: true});
    } else {
      this.props.notificationManager.addInfo('File has been deleted.');
      return null;
    }
  }

  @autobind
  diveIntoMergeConflictFileForPath(relativeFilePath) {
    return this.showMergeConflictFileForPath(relativeFilePath, {focus: true});
  }

  @autobind
  didChangeAmending(isAmending) {
    const itemsToUpdate = this.props.workspace.getPaneItems().filter(item => item instanceof FilePatchPaneItem);
    itemsToUpdate.forEach(item => item.component.setAmendingState(isAmending));
  }

  @autobind
  openCloneDialog() {
    this.setState({cloneDialogActive: true});
  }

  @autobind
  handlePanelResize(size) {
    this.setState({
      panelSize: Math.max(size, 300),
    });
  }

  @autobind
  handleChangeTab(activeTab) {
    this.setState({activeTab});
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    if (this.gitTabController) {
      return this.gitTabController.getWrappedComponent().quietlySelectItem(filePath, stagingStatus);
    } else {
      return null;
    }
  }

  async viewChangesForCurrentFile(stagingStatus) {
    const editor = this.props.workspace.getActiveTextEditor();
    const absFilePath = editor.getPath();
    const repoPath = this.props.repository.getWorkingDirectoryPath();
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
      const amending = stagingStatus === 'staged' && this.state.isAmending;
      const lineNum = editor.getCursorBufferPosition().row + 1;
      const filePatchItem = await this.props.workspace.open(
        `atom-github://file-patch/${filePath}/${stagingStatus}?${amending ? 'amending&' : ''}lineNum=${lineNum}`,
        {pending: true, activatePane: true, activateItem: true},
      );
      filePatchItem.component.focus();
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
  openFiles(filePaths) {
    return Promise.all(filePaths.map(filePath => {
      const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), filePath);
      return this.props.workspace.open(absolutePath, {pending: filePaths.length === 1});
    }));
  }

  @autobind
  getUnsavedFiles(filePaths) {
    const isModifiedByPath = new Map();
    this.props.workspace.getTextEditors().forEach(editor => {
      isModifiedByPath.set(editor.getPath(), editor.isModified());
    });
    return filePaths.filter(filePath => {
      const absFilePath = path.join(this.props.repository.getWorkingDirectoryPath(), filePath);
      return isModifiedByPath.get(absFilePath);
    });
  }

  @autobind
  ensureNoUnsavedFiles(filePaths, message) {
    const unsavedFiles = this.getUnsavedFiles(filePaths).map(filePath => `\`${filePath}\``).join('<br>');
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
  async discardLines(filePatch, lines) {
    const filePath = filePatch.getPath();
    const destructiveAction = async () => {
      const discardFilePatch = filePatch.getUnstagePatchForLines(lines);
      await this.props.repository.applyPatchToWorkdir(discardFilePatch);
    };
    return await this.props.repository.storeBeforeAndAfterBlobs(
      [filePath],
      () => this.ensureNoUnsavedFiles([filePath], 'Cannot discard lines.'),
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
  async undoLastDiscard(partialDiscardFilePath = null) {
    const filePaths = this.getFilePathsForLastDiscard(partialDiscardFilePath);
    try {
      const results = await this.props.repository.restoreLastDiscardInTempFiles(
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
        await deleteFileOrFolder(absFilePath);
      } else {
        await copyFile(resultPath, absFilePath);
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
  constructor(name, {useLegacyPanels, getState, setState, getController, getDockItem, getWorkspace}) {
    this.name = name;

    this.useLegacyPanels = useLegacyPanels;
    this.getState = getState;
    this.getWorkspace = getWorkspace;
    this.getController = getController;
    this.getDockItem = getDockItem;

    this.setStateKey = (value, options = {activateTab: false}) => {
      return new Promise(resolve => setState(value, options, resolve));
    };
  }

  getControllerComponent() {
    const controller = this.getController();

    if (!controller.getWrappedComponent) {
      return controller;
    }

    return controller.getWrappedComponent();
  }

  @autobind
  async toggle() {
    const focusToRestore = document.activeElement;
    let shouldRestoreFocus = false;

    // Rendered => the dock item is being rendered, whether or not the dock is visible or the item
    //   is visible within its dock.
    // Visible => the item is active and the dock item is active within its dock.
    const wasRendered = this.getState();
    const wasVisible = this.isVisible();

    if (!wasRendered) {
      // Not rendered.
      await this.setStateKey(true, {activateTab: true});
      await this.reveal();
      shouldRestoreFocus = true;
    } else if (!wasVisible) {
      // Rendered, but not an active item in a visible dock.
      await this.reveal();
      shouldRestoreFocus = true;
    } else {
      // Rendered and an active item within a visible dock.
      if (this.useLegacyPanels) {
        await this.setStateKey(false);
      } else {
        await this.hide();
      }
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
      await this.setStateKey(true, {activateTab: true});
      await this.reveal();
      return true;
    }
    return false;
  }

  reveal() {
    const dockItem = this.getDockItem();
    return dockItem ? dockItem.reveal() : Promise.resolve(null);
  }

  hide() {
    const dockItem = this.getDockItem();
    return dockItem ? dockItem.hide() : Promise.resolve(null);
  }

  focus() {
    this.getControllerComponent().restoreFocus();
  }

  isVisible() {
    if (!this.getState()) {
      return false;
    }

    const item = this.getDockItem();
    if (!item) {
      // Legacy panels active. Use getState(), which is true.
      return true;
    }

    const workspace = this.getWorkspace();
    return workspace.getPaneContainers()
      .filter(container => container === workspace.getCenter() || container.isVisible())
      .some(container => container.getPanes().some(pane => pane.getActiveItem() === item.getDockItem()));
  }

  hasFocus() {
    return this.getControllerComponent().hasFocus();
  }
}
