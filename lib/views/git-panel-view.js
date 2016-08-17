/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingView from './staging-view'
import CommitView from './commit-view'
import PushPullView from './push-pull-view'

export default class GitPanelView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    const pushPullView = (
      <PushPullView
        ref='pushPullView'
        push={this.props.push}
        pull={this.props.pull}
        fetch={this.props.fetch}
        aheadCount={this.props.aheadCount}
        behindCount={this.props.behindCount}
        pullEnabled={this.props.pullEnabled}
      />
    )

    return (
      <div className='git-CommitPanel' tabIndex='-1'>
        { this.props.remoteName ? pushPullView : <noscript /> }
        <StagingView
          ref='stagingView'
          stagedChanges={this.props.stagedChanges}
          unstagedChanges={this.props.unstagedChanges}
          mergeConflicts={this.props.mergeConflicts}
          didSelectFilePatch={this.props.didSelectFilePatch}
          didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
          stageFilePatch={this.props.stageFilePatch}
          unstageFilePatch={this.props.unstageFilePatch}
          stageFile={this.props.stageFile}
          unstageFile={this.props.unstageFile}
        />
        <CommitView
          ref='commitView'
          workspace={this.props.workspace}
          stagedChangesExist={this.props.stagedChanges.length > 0}
          mergeConflictsExist={this.props.mergeConflicts.length > 0}
          commit={this.props.commit}
          disableCommitButton={this}
          abortMerge={this.props.abortMerge}
          branchName={this.props.branchName}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          maximumCharacterLimit={72}
          message={this.props.mergeMessage}
          isMerging={this.props.isMerging}
        />
      </div>
    )
  }

  destroy () {
    return etch.destroy(this)
  }

  focus () {
    this.refs.stagingView.focus()
  }
}
