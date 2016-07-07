/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingView from './staging-view'
import CommitView from './commit-view'
import PushPullView from './push-pull-view'

export default class CommitPanelView {
  constructor ({repository, workspace, commandRegistry, didSelectFilePatch}) {
    this.workspace = workspace
    this.branchName = ''
    this.aheadCount = 0
    this.behindCount = 0
    this.push = this.push.bind(this)
    this.pull = this.pull.bind(this)
    this.fetch = this.fetch.bind(this)
    this.commandRegistry = commandRegistry
    this.didSelectFilePatch = didSelectFilePatch
    etch.initialize(this)
    this.setRepository(repository)
  }

  update ({repository}) {
    return this.setRepository(repository)
  }

  render () {
    if (this.repository == null) {
      return (
        <div className='git-CommitPanel'>
          <div className='git-CommitPanel-item no-repository'>
            In order to use git features, please open a file that belongs to a git repository.
          </div>
        </div>
      )
    } else if (this.patches == null) {
      return (
        <div className='git-CommitPanel'>
          <div className='git-CommitPanel-item is-loading'>
            Loading...
          </div>
        </div>
      )
    } else {
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
            stagedChanges={this.patches.stagedChanges}
            unstagedChanges={this.patches.unstagedChanges}
            didSelectFilePatch={this.didSelectFilePatch}
          />
          <CommitView
            ref='commitView'
            stagedChanges={this.patches.stagedChanges}
            repository={this.repository}
            branchName={this.branchName}
            workspace={this.workspace}
            commandRegistry={this.commandRegistry}
            maximumCharacterLimit={72}
          />
        </div>
      )
    }
  }

  destroy () {
    this.subscription.dispose()
    return etch.destroy(this)
  }

  isPullDisabled () {
    return this.patches.stagedChanges.length || this.patches.unstagedChanges.length
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

  setRepository (repository) {
    if (this.repository !== repository) {
      this.repository = repository
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.repositorySubscription = repository.onDidUpdate(this.refreshModelData.bind(this))
        return this.refreshModelData()
      }
    }
  }

  async refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh () {
    if (!this.repository) return
    const repository = this.repository
    const patches = {
      stagedChanges: await repository.getStagedChanges(),
      unstagedChanges: await repository.getUnstagedChanges()
    }
    const branchName = await repository.getBranchName()
    const remoteName = await repository.getBranchRemoteName(branchName)
    let aheadCount, behindCount
    if (remoteName) {
      await repository.fetch(branchName)
      const {ahead, behind} = await repository.getAheadBehindCount(branchName)
      aheadCount = ahead
      behindCount = behind
    }

    if (repository === this.repository) {
      this.patches = patches
      this.branchName = branchName
      this.remoteName = remoteName
      this.aheadCount = aheadCount
      this.behindCount = behindCount
      return etch.update(this)
    }
  }
}
