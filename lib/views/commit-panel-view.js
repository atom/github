/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import StagingView from './staging-view'
import CommitView from './commit-view'

export default class CommitPanelView {
  constructor ({repository, workspace, commandRegistry, didSelectFilePatch}) {
    this.workspace = workspace
    this.commandRegistry = commandRegistry
    this.didSelectFilePatch = didSelectFilePatch
    this.setRepository(repository)
    etch.initialize(this)
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
      <div className='git-CommitPanel'>
        <div className='git-CommitPanel-item is-loading'>
          Loading...
        </div>
      </div>
    } else {
      return (
        <div className='git-CommitPanel' tabIndex='-1'>
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
    return etch.update(this)
  }
}
