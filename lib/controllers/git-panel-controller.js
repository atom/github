/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import GitPanelView from '../views/git-panel-view'

export default class GitPanelController {
  constructor ({workspace, commandRegistry, repository}) {
    this.workspace = workspace
    this.commandRegistry = commandRegistry
    this.switchRepository(repository)
    etch.initialize(this)
  }

  render () {
    if (this.repository) {
      console.log(this.unstagedChanges);
      return (
        <GitPanelView
          ref='gitPanel'
          workspace={this.workspace}
          commandRegistry={this.commandRegistry}
          repository={this.repository}
          unstagedChanges={this.unstagedChanges}
          stagedChanges={this.stagedChanges}
          branchName={this.branchName}
          remoteName={this.remoteName}
          aheadCount={this.aheadCount}
          behindCount={this.behindCount}
        />
      )
    } else {
      return <div />
    }
  }

  update ({repository}) {
    return this.switchRepository(repository)
  }

  switchRepository (repository) {
    if (repository !== this.repository) {
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.repositorySubscription = repository.onDidUpdate(() => this.refreshModelData(repository))
      }

      return this.refreshModelData(repository)
    }
  }

  // DON'T make this an async function. causes promises to not resolve in expected order
  refreshModelData (repository) {
    this.lastModelDataRefreshPromise = this._refreshModelData(repository)
    return this.lastModelDataRefreshPromise
  }

  async _refreshModelData (repository) {
    if (repository) {
      const stagedChanges = await repository.getStagedChanges()
      const unstagedChanges = await repository.getUnstagedChanges()
      const branchName = await repository.getBranchName()
      const remoteName = await repository.getBranchRemoteName(branchName)
      let aheadCount, behindCount
      if (remoteName) {
        // TODO: re-enable this when authentication works
        // await repository.fetch(branchName)
        const counts = await repository.getAheadBehindCount(branchName)
        aheadCount = counts.ahead
        behindCount = counts.behind
      }

      this.unstagedChanges = unstagedChanges
      this.stagedChanges = stagedChanges
      this.branchName = branchName
      this.remoteName = remoteName
      this.aheadCount = aheadCount
      this.behindCount = behindCount
    }

    this.repository = repository
    return etch.update(this)
  }
}
