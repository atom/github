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
      return (
        <div className='git-CommitPanel' tabIndex='-1'>
          <PushPullView
            ref='pushPullView'
            push={this.push}
            pull={this.pull}
            fetch={this.fetch}
            aheadCount={this.aheadCount}
            behindCount={this.behindCount} />
          <StagingView
            ref='stagingView'
            repository={this.repository}
            stagedChanges={this.patches.stagedChanges}
            unstagedChanges={this.patches.unstagedChanges}
            didSelectFilePatch={this.didSelectFilePatch} />
          <CommitView
            ref='commitView'
            stagedChanges={this.patches.stagedChanges}
            repository={this.repository}
            branchName={this.branchName}
            workspace={this.workspace}
            commandRegistry={this.commandRegistry}
            maximumCharacterLimit={72} />
        </div>
      )
    }
  }

  destroy () {
    this.subscription.dispose()
    return etch.destroy(this)
  }

  async push () {
    await this.repository.push(this.branchName)
    this.refreshModelData()
  }

  async pull () {
    await this.repository.pull(this.branchName)
    this.refreshModelData()
  }

  async fetch () {
    await this.repository.fetch(this.branchName)
    this.refreshModelData()
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
      } else {
        return Promise.resolve()
      }
    } else {
      return Promise.resolve()
    }
  }

  async refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh () {
    this.patches = await this.refreshStagedAndUnstagedChanges()
    this.branchName = await this.repository.getBranchName()
    const {ahead, behind} = await this.refreshAheadBehindCount(this.branchName)
    this.aheadCount = ahead
    this.behindCount = behind
    return etch.update(this)
  }

  async refreshStagedAndUnstagedChanges () {
    return {
      stagedChanges: await this.repository.getStagedChanges(),
      unstagedChanges: await this.repository.getUnstagedChanges()
    }
  }

  async refreshAheadBehindCount (branchName) {
    await this.repository.fetch(branchName)
    return this.repository.getAheadBehindCount(branchName)
  }
}
