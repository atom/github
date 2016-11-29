/** @babel */

import {CompositeDisposable} from 'atom'

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
    legacyStatusBar: React.PropTypes.bool,
  }

  static defaultProps = {
    legacyStatusBar: false,
  }

  constructor (props, context) {
    super(props, context)
    this.state = {
      ...nullFilePatchState
    }

    this.showFilePatchForPath = this.showFilePatchForPath.bind(this)
    this.showMergeConflictFileForPath = this.showMergeConflictFileForPath.bind(this)
    this.didChangeAmending = this.didChangeAmending.bind(this)
    this.onRepoRefresh = this.onRepoRefresh.bind(this)
    this.subscriptions = new CompositeDisposable()
  }

  render () {
    return (
      <div>
        <StatusBar statusBar={this.props.statusBar} legacy={this.props.legacyStatusBar}>
          <EtchWrapper type="span">
            <StatusBarTileController
              workspace={this.props.workspace}
              repository={this.props.repository}
              toggleGitPanel={this.toggleGitPanel}
            />
          </EtchWrapper>
        </StatusBar>
        {this.props.gitPanelActive ? this.renderGitPanel() : null}
        {(this.state.filePath && this.state.filePatch) ? this.renderFilePatchController() : null}
      </div>
    )
  }

  renderGitPanel () {
    return (
      <Panel
        workspace={this.props.workspace}
        location="right"
        getItem={container => container.getWrappedComponent()}
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
        getItem={container => container.getWrappedComponent()}
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

  showMergeConflictFileForPath() {}

  didChangeAmending (isAmending) {
    this.showFilePatchForPath(this.state.filePath, this.state.stagingStatus, {amending: isAmending})
  }

  focusFilePatchView() {}
}
