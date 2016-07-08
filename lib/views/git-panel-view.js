/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingView from './staging-view'
import CommitView from './commit-view'
import PushPullView from './push-pull-view'

export default class GitPanelView {
  constructor ({workspace, commandRegistry, repository, unstagedChanges, stagedChanges, branchName, remoteName, aheadCount, behindCount}) {
    this.workspace = workspace
    this.commandRegistry = commandRegistry
    this.repository = repository
    this.unstagedChanges = unstagedChanges
    this.stagedChanges = stagedChanges
    this.branchName = branchName
    this.remoteName = remoteName
    this.aheadCount = aheadCount
    this.behindCount = behindCount

    etch.initialize(this)
  }

  update ({repository, unstagedChanges, stagedChanges, branchName, remoteName, aheadCount, behindCount}) {
    this.repository = repository
    this.unstagedChanges = unstagedChanges
    this.stagedChanges = stagedChanges
    this.branchName = branchName
    this.remoteName = remoteName
    this.aheadCount = aheadCount
    this.behindCount = behindCount

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
        pullDisabled={this.isPullDisabled()}
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
    this.subscription.dispose()
    return etch.destroy(this)
  }

  isPullDisabled () {
    return this.stagedChanges.length || this.unstagedChanges.length
  }

  async push () {
    await this.repository.push(this.branchName)
    return this.refreshModelData()
  }

  async pull () {
    if (!this.isPullDisabled()) {
      await this.repository.pull(this.branchName)
      return this.refreshModelData()
    }
  }

  async fetch () {
    await this.repository.fetch(this.branchName)
    return this.refreshModelData()
  }
}
