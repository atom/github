/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingView from './staging-view'
import CommitView from './commit-view'
import PushPullView from './push-pull-view'

export default class GitPanelView {
  constructor ({workspace, commandRegistry, repository, unstagedChanges, stagedChanges, branchName, remoteName, aheadCount, behindCount, pullEnabled, push, pull, fetch}) {
    this.workspace = workspace
    this.commandRegistry = commandRegistry
    this.repository = repository
    this.unstagedChanges = unstagedChanges
    this.stagedChanges = stagedChanges
    this.branchName = branchName
    this.remoteName = remoteName
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    this.pullEnabled = pullEnabled
    this.push = push
    this.pull = pull
    this.fetch = fetch

    etch.initialize(this)
  }

  update ({repository, unstagedChanges, stagedChanges, branchName, remoteName, aheadCount, behindCount, pullEnabled, push, pull, fetch}) {
    this.repository = repository
    this.unstagedChanges = unstagedChanges
    this.stagedChanges = stagedChanges
    this.branchName = branchName
    this.remoteName = remoteName
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    this.pullEnabled = pullEnabled
    this.push = push
    this.pull = pull
    this.fetch = fetch

    return etch.update(this)
  }

  render () {
    const pushPullView = (
      <PushPullView
        ref='pushPullView'
        push={this.push}
        pull={this.pull}
        fetch={this.fetch}
        aheadCount={this.aheadCount}
        behindCount={this.behindCount}
        pullEnabled={this.pullEnabled}
      />
    )

    return (
      <div className='git-CommitPanel' tabIndex='-1'>
        { this.remoteName ? pushPullView : <noscript /> }
        <StagingView
          ref='stagingView'
          repository={this.repository}
          stagedChanges={this.stagedChanges}
          unstagedChanges={this.unstagedChanges}
          didSelectFilePatch={this.didSelectFilePatch}
        />
        <CommitView
          ref='commitView'
          workspace={this.workspace}
          stagedChanges={this.stagedChanges}
          repository={this.repository}
          branchName={this.branchName}
          commandRegistry={this.commandRegistry}
          maximumCharacterLimit={72}
        />
      </div>
    )
  }

  destroy () {
    return etch.destroy(this)
  }
}
