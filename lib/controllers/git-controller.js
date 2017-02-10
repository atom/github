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
import Commands, {Command} from '../views/commands';
import GithubController from './github-controller';
import FilePatchController from './file-patch-controller';
import GitPanelController from './git-panel-controller';
import StatusBarTileController from './status-bar-tile-controller';
import ModelObserver from '../models/model-observer';
import ModelStateRegistry from '../models/model-state-registry';
import {copyFile, readFile} from '../helpers';
import {GitError} from '../git-shell-out-strategy';

const nullFilePatchState = {
  filePath: null,
  filePatch: null,
  stagingStatus: null,
  partiallyStaged: null,
};

export default class GitController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    notificationManager: React.PropTypes.object.isRequired,
    confirm: React.PropTypes.func.isRequired,
    repository: React.PropTypes.object,
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
    };

    this.repositoryStateRegistry = new ModelStateRegistry(GitController, {
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
        {this.renderGitPanel()}
        {(this.state.filePath && this.state.filePatch) ? this.renderFilePatchController() : null}
      </div>
    );
  }

  renderStatusBarTile() {
    return (
      <StatusBar statusBar={this.props.statusBar} onConsumeStatusBar={sb => this.onConsumeStatusBar(sb)}>
        <EtchWrapper type="span">
          <StatusBarTileController
            workspace={this.props.workspace}
            repository={this.props.repository}
            commandRegistry={this.props.commandRegistry}
            toggleGitPanel={this.toggleGitPanel}
          />
        </EtchWrapper>
      </StatusBar>
    );
  }

  renderGitPanel() {
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
                <GitPanelController
                  workspace={this.props.workspace}
                  commandRegistry={this.props.commandRegistry}
                  notificationManager={this.props.notificationManager}
                  repository={this.props.repository}
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
                />
              </EtchWrapper>
            </Tabs.Panel>
            {this.props.githubEnabled && (
              <Tabs.Panel title="Hub">
                <GithubController repository={this.props.repository} />
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
  discardWorkDirChangesForPaths(filePaths) {
    return this.props.repository.discardWorkDirChangesForPaths(filePaths);
  }

  @autobind
  handleChangeTab(activeTab) {
    this.setState({activeTab});
  }

  @autobind
  async discardLines(lines) {
    const isSafe = () => {
      const editor = this.props.workspace.getTextEditors().find(e => e.getPath() === absFilePath);
      if (editor && editor.isModified()) {
        this.props.notificationManager.addError(
          'Cannot discard lines.',
          {description: `You have unsaved changes in ${relFilePath}.`},
        );
        return false;
      } else {
        return true;
      }
    };

    const relFilePath = this.state.filePatch.getPath();
    const absFilePath = path.join(this.props.repository.getWorkingDirectoryPath(), relFilePath);
    const filePatch = this.state.filePatch;
    const destructiveAction = async () => {
      const discardFilePatch = filePatch.getUnstagePatchForLines(lines);
      await this.props.repository.applyPatchToWorkdir(discardFilePatch);
    };
    const snapshots = await this.props.repository.storeBeforeAndAfterBlobs(
      relFilePath,
      isSafe,
      destructiveAction,
      {partial: true},
    );
    return snapshots;
  }

  @autobind
  async undoLastDiscard(filePath) {
    const relFilePath = this.state.filePatch.getPath();
    const absFilePath = path.join(this.props.repository.getWorkingDirectoryPath(), relFilePath);
    const isSafe = () => {
      const editor = this.props.workspace.getTextEditors().find(e => e.getPath() === absFilePath);
      if (editor && editor.getBuffer().isModified()) {
        this.props.notificationManager.addError(
          'Cannot undo last discard.',
          {description: `You have unsaved changes in ${relFilePath}.`},
        );
        return false;
      }
      return true;
    };
    try {
      const result = await this.props.repository.undoLastDiscardInTempFile(filePath, isSafe, {partial: true});
      if (!result) { return; }
      const {resultPath, conflict} = result;
      if (!conflict) {
        await this.proceedWithLastDiscardUndo(resultPath, relFilePath, absFilePath);
      } else {
        const choice = this.props.confirm({
          message: `Undoing will result in conflicts in ${relFilePath}.`,
          detailedMessage: 'Would you like to apply the changes with merge conflict markers, ' +
            'or open the text with merge conflict markers in a new file?',
          buttons: ['Merge with conflict markers', 'Open in new file', 'Cancel undo'],
        });
        if (choice === 0) {
          await this.proceedWithLastDiscardUndo(resultPath, relFilePath, absFilePath);
        } else if (choice === 1) {
          await this.openConflictInNewFile(resultPath);
        }
      }
    } catch (e) {
      if (e instanceof GitError && e.stdErr.match(/fatal: Not a valid object name/)) {
        this.props.repository.clearPartialDiscardHistoryForPath(filePath);
        this.props.notificationManager.addError(
          'Discard history has expired.',
          {description: `Cannot undo discard for "${filePath}". Stale discard history has been deleted.`},
        );
      } else {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }

  async proceedWithLastDiscardUndo(resultPath, relFilePath, absFilePath) {
    await copyFile(resultPath, absFilePath);
    await this.props.repository.popUndoHistoryForFilePath(relFilePath);
  }

  async openConflictInNewFile(resultPath) {
    const contents = await readFile(resultPath);
    const editor = await this.props.workspace.open();
    editor.setText(contents);
    return editor;
  }

  @autobind
  quietlySelectItem(filePath, stagingStatus) {
    if (this.gitPanelController) {
      return this.gitPanelController.getWrappedComponent().quietlySelectItem(filePath, stagingStatus);
    } else {
      return null;
    }
  }
}
