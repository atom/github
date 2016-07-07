/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import GitPanelView from './git-panel-view'

export default class GitPanelController {
  constructor ({repository}) {
    this.repository = repository
    this.loaded = false
  }

  render () {
    if (this.loaded) {
      <GitPanelView />
    } else {
      <div />
    }
  }

  setRepository () {

  }

  async refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh (repository) {
    if (repository) return

    const repository = this.repository
    const stagedChanges = await repository.getStagedChanges(),
    const unstagedChanges = await repository.getUnstagedChanges()
    const branchName = await repository.getBranchName()
    const remoteName = await repository.getBranchRemoteName(branchName)
    let aheadCount, behindCount
    if (remoteName) {
      // TODO: re-enable this when authentication works
      // await repository.fetch(branchName)
      const {ahead: aheadCount, behind: behindCount} = await repository.getAheadBehindCount(branchName)
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
