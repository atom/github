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
    } else if (this.modelData == null) {
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
            repository={this.repository}
            branchName={this.branchName} />
          <StagingView
            ref='stagingView'
            repository={this.repository}
            stagedChanges={this.modelData.stagedChanges}
            unstagedChanges={this.modelData.unstagedChanges}
            didSelectFilePatch={this.didSelectFilePatch} />
          <CommitView
            ref='commitView'
            stagedChanges={this.modelData.stagedChanges}
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

  setRepository (repository) {
    if (this.repository !== repository) {
      this.repository = repository
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.repositorySubscription = repository.onDidUpdate(this.refreshModelData.bind(this))
        this.repository.getBranchName().then(branchName => {
          this.branchName = branchName
          etch.update(this)
        })
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
    this.modelData = {
      stagedChanges: await this.repository.getStagedChanges(),
      unstagedChanges: await this.repository.getUnstagedChanges()
    }
    // await this.refreshAheadBehindCount(this.branchName)
    return etch.update(this)
  }

  async refreshAheadBehindCount (branchName) {
    await this.repository.fetch(branchName)
    const {ahead, behind} = this.repository.getAheadBehindCount(branchName)
    this.aheadCount = ahead
    this.behindCount = behind
    return etch.update(this)
  }
}
