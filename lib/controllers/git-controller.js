/** @babel */

import path from 'path'

import {CompositeDisposable, File} from 'atom'

import React from 'react'
import ReactDom from 'react-dom'

import EtchWrapper from '../views/etch-wrapper'
import StatusBar from '../views/status-bar'
import Panel from '../views/panel'
import PaneItem from '../views/pane-item'
import FilePatchController from './file-patch-controller'
import GitPanelController from './git-panel-controller'
import StatusBarTileController from './status-bar-tile-controller'

const nullFilePatchState = {
  filePath: null,
  filePatch: null,
  stagingStatus: null,
  amending: null,
}

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

  serialize () {
    return {
      gitPanelActive: this.state.gitPanelActive
    }
  }

  constructor (props, context) {
    super(props, context)
    this.state = {
      ...nullFilePatchState,
      gitPanelActive: props.savedState.gitPanelActive,
    }

    this.showFilePatchForPath = this.showFilePatchForPath.bind(this)
    this.showMergeConflictFileForPath = this.showMergeConflictFileForPath.bind(this)
    this.didChangeAmending = this.didChangeAmending.bind(this)
    this.onRepoRefresh = this.onRepoRefresh.bind(this)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      props.commandRegistry.add('atom-workspace', {'git:toggle-git-panel': this.toggleGitPanel.bind(this)}),
      props.commandRegistry.add('atom-workspace', {'git:focus-git-panel': this.focusGitPanel.bind(this)}),
    )
  }

  render () {
    return (
      <div>
        <StatusBar statusBar={this.props.statusBar} onConsumeStatusBar={(sb) => this.onConsumeStatusBar(sb)}>
          <EtchWrapper type="span">
            <StatusBarTileController
              workspace={this.props.workspace}
              repository={this.props.repository}
              toggleGitPanel={this.toggleGitPanel}
            />
          </EtchWrapper>
        </StatusBar>
        {this.state.gitPanelActive ? this.renderGitPanel() : null}
        {(this.state.filePath && this.state.filePatch) ? this.renderFilePatchController() : null}
      </div>
    )
  }

  renderGitPanel () {
    return (
      <Panel
        workspace={this.props.workspace}
        location="right"
        getItem={({subtree}) => subtree.getWrappedComponent()}
        onDidClosePanel={() => this.setState({gitPanelActive: false})}
      >
        <EtchWrapper ref={c => this.gitPanelController = c} reattachDomNode={false}>
          <GitPanelController
            workspace={this.props.workspace}
            commandRegistry={this.props.commandRegistry}
            notificationManager={this.props.notificationManager}
            repository={this.props.repository}
            didSelectFilePath={this.showFilePatchForPath}
            didSelectMergeConflictFile={this.showMergeConflictFileForPath}
            didChangeAmending={this.didChangeAmending}
            focusFilePatchView={this.focusFilePatchView}
          />
        </EtchWrapper>
      </Panel>
    )
  }

  renderFilePatchController () {
    return (
      <PaneItem
        workspace={this.props.workspace}
        getItem={({subtree}) => subtree.getWrappedComponent()}
        ref={c => this.filePatchControllerPane = c}
        onDidCloseItem={() => this.setState({...nullFilePatchState})}
      >
        <EtchWrapper ref={c => this.filePatchController = c} reattachDomNode={false}>
          <FilePatchController
            repository={this.props.repository}
            filePatch={this.state.filePatch}
            stagingStatus={this.state.stagingStatus}
            onRepoRefresh={this.onRepoRefresh}
          />
        </EtchWrapper>
      </PaneItem>
    )
  }

  componentWillUnmount () {
    this.subscriptions.dispose()
  }

  onConsumeStatusBar (statusBar) {
    if (statusBar.disableGitInfoTile) {
      statusBar.disableGitInfoTile()
    }
  }

  async showFilePatchForPath (filePath, stagingStatus, {activate, amending} = {}) {
    if (!filePath) return
    const repository = this.props.repository
    if (!repository) return

    const filePatch = await repository.getFilePatchForPath(filePath, {staged: stagingStatus === 'staged', amending})
    if (filePatch) {
      this.setState({ filePath, filePatch, stagingStatus, amending }, () => {
        // TODO: can be better done w/ a prop?
        if (activate) {
          this.filePatchControllerPane.activate()
        }
      })
    } else {
      this.setState({...nullFilePatchState})
    }
  }

  onRepoRefresh () {
    this.showFilePatchForPath(this.state.filePath, this.state.stagingStatus, {amending: this.state.amending})
  }

  async showMergeConflictFileForPath (relativeFilePath, {focus} = {}) {
    const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), relativeFilePath)
    if (await new File(absolutePath).exists()) {
      return this.props.workspace.open(absolutePath, {activatePane: Boolean(focus), pending: true})
    } else {
      this.props.notificationManager.addInfo('File has been deleted.')
    }
  }

  didChangeAmending (isAmending) {
    this.showFilePatchForPath(this.state.filePath, this.state.stagingStatus, {amending: isAmending})
  }

  toggleGitPanel () {
    this.setState(state => ({gitPanelActive: !state.gitPanelActive}))
  }

  focusGitPanel () {
    if (!this.state.gitPanelActive) {
      this.setState({gitPanelActive: true}, () => {
        // TODO: why doesn't a setTimeout of 0 or even 100 work here?
        // Suspect it has to do with the command palette closing...
        setTimeout(() => this.gitPanelController.getWrappedComponent().focus(), 200)
      })
    }
  }

  focusFilePatchView() {}
}
