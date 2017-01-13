import path from 'path';

import {CompositeDisposable, Disposable, File} from 'atom';

import React from 'react';
import {autobind} from 'core-decorators';

import EtchWrapper from '../views/etch-wrapper';
import StatusBar from '../views/status-bar';
import Panel from '../views/panel';
import PaneItem from '../views/pane-item';
import Commands, {Command} from '../views/commands';
import FilePatchController from './file-patch-controller';
import GitPanelController from './git-panel-controller';
import StatusBarTileController from './status-bar-tile-controller';
import ModelObserver from '../models/model-observer';
import ModelStateRegistry from '../models/model-state-registry';

const nullFilePatchState = {
  filePath: null,
  filePatch: null,
  stagingStatus: null,
};

export default class GitController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    notificationManager: React.PropTypes.object.isRequired,
    repository: React.PropTypes.object,
    statusBar: React.PropTypes.object,
    savedState: React.PropTypes.object,
  }

  static defaultProps = {
    savedState: {},
  }

  serialize() {
    return {
      gitPanelActive: this.state.gitPanelActive,
    };
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      ...nullFilePatchState,
      amending: false,
      gitPanelActive: !!props.savedState.gitPanelActive,
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
        getItem={({subtree}) => subtree.getWrappedComponent()}
        onDidClosePanel={() => this.setState({gitPanelActive: false})}
        visible={!!this.state.gitPanelActive}>
        <EtchWrapper ref={c => { this.gitPanelController = c; }} reattachDomNode={false}>
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
          />
        </EtchWrapper>
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
              onRepoRefresh={this.onRepoRefresh}
              didSurfaceFile={this.surfaceFromFileAtPath}
              openFiles={this.openFiles}
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

    const filePatch = await repository.getFilePatchForPath(filePath, {staged: stagingStatus === 'staged', amending});
    return new Promise(resolve => {
      if (filePatch) {
        this.setState({filePath, filePatch, stagingStatus}, () => {
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
}
