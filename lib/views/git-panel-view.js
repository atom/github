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
    return (
      <div className='git-CommitPanel' tabIndex='-1'>
        <StagingView
          ref='stagingView'
          stagedChanges={this.props.stagedChanges}
          unstagedChanges={this.props.unstagedChanges}
          mergeConflicts={this.props.mergeConflicts}
          didSelectFilePatch={this.props.didSelectFilePatch}
          didSelectMergeConflictFile={this.props.didSelectMergeConflictFile}
          stageFiles={this.props.stageFiles}
          unstageFiles={this.props.unstageFiles}
          lastCommit={this.props.lastCommit}
          isAmending={this.props.isAmending}
        />
        <CommitView
          ref='commitView'
          workspace={this.props.workspace}
          stagedChangesExist={this.props.stagedChanges.length > 0}
          mergeConflictsExist={this.props.mergeConflicts.length > 0}
          commit={this.props.commit}
          setAmending={this.props.setAmending}
          disableCommitButton={this}
          abortMerge={this.props.abortMerge}
          branchName={this.props.branchName}
          commandRegistry={this.props.commandRegistry}
          notificationManager={this.props.notificationManager}
          maximumCharacterLimit={72}
          message={this.props.mergeMessage}
          isMerging={this.props.isMerging}
          isAmending={this.props.isAmending}
          lastCommit={this.props.lastCommit}
          repository={this.props.repository}
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
