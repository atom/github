import fs from 'fs';
import path from 'path';

import {CompositeDisposable, Disposable, File} from 'atom';

import React from 'react';
import {autobind} from 'core-decorators';

import EtchWrapper from '../views/etch-wrapper';
import StatusBar from '../views/status-bar';
import Panel from '../views/panel';
import PaneItem from '../views/pane-item';
import Resizer from '../views/resizer';
import Tabs from '../views/tabs';
import CloneDialog from '../views/clone-dialog';
import Commands, {Command} from '../views/commands';
import GithubTabController from './github-tab-controller';
import FilePatchController from './file-patch-controller';
import GitTabController from './git-tab-controller';
import StatusBarTileController from './status-bar-tile-controller';
import RepositoryConflictController from './repository-conflict-controller';
import ModelObserver from '../models/model-observer';
import ModelStateRegistry from '../models/model-state-registry';
import Conflict from '../models/conflicts/conflict';
import {copyFile, deleteFileOrFolder} from '../helpers';
import {GitError} from '../git-shell-out-strategy';

const nullFilePatchState = {
  filePath: null,
  filePatch: null,
  stagingStatus: null,
  partiallyStaged: null,
};

export default class RootController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    notificationManager: React.PropTypes.object.isRequired,
    tooltips: React.PropTypes.object.isRequired,
    config: React.PropTypes.object.isRequired,
    confirm: React.PropTypes.func.isRequired,
    activeProjectPath: React.PropTypes.string,
    createRepositoryForProjectPath: React.PropTypes.func,
    cloneRepositoryForProjectPath: React.PropTypes.func,
    repository: React.PropTypes.object,
    resolutionProgress: React.PropTypes.object,
    statusBar: React.PropTypes.object,
    savedState: React.PropTypes.object,
    githubEnabled: React.PropTypes.bool,
  }

  static defaultProps = {
    savedState: {},
    githubEnabled: false,
  }

  serialize() {
    return {
      gitPanelActive: this.state.gitPanelActive,
      panelSize: this.state.panelSize,
      activeTab: this.state.activeTab,
    };
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      ...nullFilePatchState,
      amending: false,
      gitPanelActive: !!props.savedState.gitPanelActive,
      panelSize: props.savedState.panelSize || 400,
      activeTab: props.savedState.activeTab || 0,
      cloneDialogActive: false,
      cloneDialogInProgress: false,
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
    this.subscriptions.add(
      props.commandRegistry.add('atom-workspace', {
        'github:toggle-git-panel': this.toggleGitPanel,
        'github:toggle-git-panel-focus': this.toggleGitPanelFocus,
        'github:clone': this.openCloneDialog,
      }),
    );

    this.repositoryObserver = new ModelObserver({
      didUpdate: () => this.onRepoRefresh(),
    });
    this.repositoryObserver.setActiveModel(props.repository);
    this.subscriptions.add(
      new Disposable(() => this.repositoryObserver.destroy()),
    );
  }

  componentWillMount() {
    this.repositoryStateRegistry.setModel(this.props.repository);
  }

  componentWillReceiveProps(newProps) {
    this.repositoryObserver.setActiveModel(newProps.repository);
    this.repositoryStateRegistry.setModel(newProps.repository);
  }

  render() {
    return (
      <div>
        {this.renderStatusBarTile()}
        {this.renderGitHubPanel()}
        {(this.state.filePath && this.state.filePatch) ? this.renderFilePatchController() : null}
        {this.renderCloneDialog()}
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
          toggleGitPanel={this.toggleGitPanel}
        />
      </StatusBar>
    );
  }

  renderGitHubPanel() {
    return (
      <Panel
        workspace={this.props.workspace}
        location="right"
        onDidClosePanel={() => this.setState({gitPanelActive: false})}
        visible={!!this.state.gitPanelActive}>
        <Resizer
          size={this.state.panelSize}
          onChange={this.handlePanelResize}
          className="github-PanelResizer">
          <Tabs activeIndex={this.state.activeTab} onChange={this.handleChangeTab} className="sidebar-tabs">
            <Tabs.Panel title="Git">
              <EtchWrapper
                ref={c => { this.gitPanelController = c; }}
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
                  didSelectFilePath={this.showFilePatchForPath}
                  didDiveIntoFilePath={this.diveIntoFilePatchForPath}
                  didSelectMergeConflictFile={this.showMergeConflictFileForPath}
                  didDiveIntoMergeConflictPath={this.diveIntoMergeConflictFileForPath}
                  didChangeAmending={this.didChangeAmending}
                  focusFilePatchView={this.focusFilePatchView}
                  ensureGitPanel={this.ensureGitPanel}
                  openFiles={this.openFiles}
                  discardWorkDirChangesForPaths={this.discardWorkDirChangesForPaths}
                  undoLastDiscard={this.undoLastDiscard}
                  refreshResolutionProgress={this.refreshResolutionProgress}
                />
              </EtchWrapper>
            </Tabs.Panel>
            {this.props.githubEnabled && (
              <Tabs.Panel title="Hub">
                <GithubTabController repository={this.props.repository} />
              </Tabs.Panel>
            )}
          </Tabs>
        </Resizer>
      </Panel>
    );
  }

  renderFilePatchController() {
    return (
      <div>
        <Commands registry={this.props.commandRegistry} target="atom-workspace">
          <Command command="github:focus-diff-view" callback={this.focusFilePatchView} />
        </Commands>
        <PaneItem
          workspace={this.props.workspace}
          getItem={({subtree}) => subtree.getWrappedComponent()}
          ref={c => { this.filePatchControllerPane = c; }}
          onDidCloseItem={() => { this.setState({...nullFilePatchState}); }}>
          <EtchWrapper ref={c => { this.filePatchController = c; }} reattachDomNode={false}>
            <FilePatchController
              repository={this.props.repository}
              commandRegistry={this.props.commandRegistry}
              filePatch={this.state.filePatch}
              stagingStatus={this.state.stagingStatus}
              isAmending={this.state.amending}
              isPartiallyStaged={this.state.partiallyStaged}
              onRepoRefresh={this.onRepoRefresh}
              didSurfaceFile={this.surfaceFromFileAtPath}
              didDiveIntoFilePath={this.diveIntoFilePatchForPath}
              quietlySelectItem={this.quietlySelectItem}
              openFiles={this.openFiles}
              discardLines={this.discardLines}
              undoLastDiscard={this.undoLastDiscard}
            />
          </EtchWrapper>
        </PaneItem>
      </div>
    );
  }

  renderCloneDialog() {
    if (!this.state.cloneDialogActive) {
      return null;
    }

    return (
      <Panel
        workspace={this.props.workspace}
        location="modal">
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
  initializeRepo() {
    this.props.createRepositoryForProjectPath(this.props.activeProjectPath);
  }

  @autobind
  async acceptClone(remoteUrl, projectPath) {
    this.setState({cloneDialogInProgress: true});
    try {
      await this.props.cloneRepositoryForProjectPath(remoteUrl, projectPath);
    } catch (e) {
      if (!(e instanceof GitError)) {
        throw e;
      } else {
        this.props.notificationManager.addError(`Unable to clone ${remoteUrl}`, {detail: e.stdErr, dismissable: true});
      }
    } finally {
      this.setState({cloneDialogInProgress: false, cloneDialogActive: false});
    }
  }

  @autobind
  cancelClone() {
    this.setState({cloneDialogActive: false});
  }

  @autobind
  async showFilePatchForPath(filePath, stagingStatus, {activate, amending} = {}) {
    if (!filePath) { return null; }
    const repository = this.props.repository;
    if (!repository) { return null; }

    const staged = stagingStatus === 'staged';
    const filePatch = await repository.getFilePatchForPath(filePath, {staged, amending: staged && amending});
    const partiallyStaged = await repository.isPartiallyStaged(filePath);
    return new Promise(resolve => {
      if (filePatch) {
        this.setState({filePath, filePatch, stagingStatus, partiallyStaged}, () => {
          // TODO: can be better done w/ a prop?
          if (activate && this.filePatchControllerPane) {
            this.filePatchControllerPane.activate();
          }
          resolve();
        });
      } else {
        this.setState({...nullFilePatchState}, resolve);
      }
    });
  }

  @autobind
  async diveIntoFilePatchForPath(filePath, stagingStatus, {amending} = {}) {
    await this.showFilePatchForPath(filePath, stagingStatus, {activate: true, amending});
    this.focusFilePatchView();
  }

  @autobind
  surfaceFromFileAtPath(filePath, stagingStatus) {
    if (this.gitPanelController) {
      this.gitPanelController.getWrappedComponent().focusAndSelectStagingItem(filePath, stagingStatus);
    }
  }

  @autobind
  onRepoRefresh() {
    return this.showFilePatchForPath(this.state.filePath, this.state.stagingStatus, {amending: this.state.amending});
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
    this.setState({amending: isAmending});
    return this.showFilePatchForPath(this.state.filePath, this.state.stagingStatus, {amending: isAmending});
  }

  @autobind
  toggleGitPanel() {
    this.setState(state => ({gitPanelActive: !state.gitPanelActive}));
  }

  @autobind
  toggleGitPanelFocus() {
    if (!this.state.gitPanelActive) {
      this.setState({gitPanelActive: true}, () => this.toggleGitPanelFocus());
      return;
    }

    if (this.gitPanelHasFocus()) {
      this.props.workspace.getActivePane().activate();
    } else {
      this.focusGitPanel();
    }
  }

  @autobind
  openCloneDialog() {
    this.setState({cloneDialogActive: true});
  }

  @autobind
  focusGitPanel() {
    this.gitPanelController.getWrappedComponent().focus();
  }

  gitPanelHasFocus() {
    return this.gitPanelController.getWrappedComponent().isFocused();
  }

  // Ensure that the Git panel is visible. Returns a Promise that resolves to `true` if the panel was initially
  // hidden or `false` if it was already shown.
  @autobind
  ensureGitPanel() {
    if (!this.state.gitPanelActive) {
      return new Promise((resolve, reject) => {
        this.setState({gitPanelActive: true}, () => resolve(true));
      });
    }

    return Promise.resolve(false);
  }

  @autobind
  handlePanelResize(size) {
    this.setState({
      panelSize: Math.max(size, 250),
    });
  }

  @autobind
  handleChangeTab(activeTab) {
    this.setState({activeTab});
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    if (this.gitPanelController) {
      return this.gitPanelController.getWrappedComponent().quietlySelectItem(filePath, stagingStatus);
    } else {
      return null;
    }
  }

  @autobind
  focusFilePatchView() {
    this.filePatchController.getWrappedComponent().focus();
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
  async discardLines(lines) {
    const filePath = this.state.filePatch.getPath();
    const filePatch = this.state.filePatch;
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
      const {filePath, resultPath, deleted, conflict, theirsSha, commonBaseSha} = result;
      const absFilePath = path.join(this.props.repository.getWorkingDirectoryPath(), filePath);
      if (deleted && resultPath === null) {
        await deleteFileOrFolder(absFilePath);
      } else {
        await copyFile(resultPath, absFilePath);
      }
      if (conflict) {
        const currentSha = await this.props.repository.createBlob({filePath});
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
}
