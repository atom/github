/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FileDiffListComponent from './file-diff-list-component'

export default class StagingComponent {
  constructor ({repository}) {
    this.refreshModelData = this.refreshModelData.bind(this)
    this.setRepository(repository)
    etch.initialize(this)
  }

  setRepository (repository) {
    if (this.repository !== repository) {
      this.repository = repository
      this.modelData = null
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.refreshModelData()
        this.repositorySubscription = repository.onDidUpdate(this.refreshModelData)
      }
    } else {
      return Promise.resolve()
    }
  }

  refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh () {
    this.modelData = {
      stagedFileDiffs: await this.repository.getStagedChanges(),
      unstagedFileDiffs: await this.repository.getUnstagedChanges()
    }
    return etch.update(this)
  }

  async didConfirmStagedFileDiff (fileDiff) {
    await this.repository.unstageFileDiff(fileDiff)
  }

  async didConfirmUnstagedFileDiff (fileDiff) {
    await this.repository.stageFileDiff(fileDiff)
  }

  update ({repository}) {
    this.setRepository(repository)
    return etch.update(this)
  }

  render () {
    if (this.modelData == null) {
      return <div />
    } else {
      return (
        <div className="git-FileList-Container" style={{width: 200}}>
          <div className="git-Panel-item is-flexible git-StagedChanges">
            <header className='git-CommitPanel-item is-header'>Staged Changes</header>
            <FileDiffListComponent
              ref='stagedChangesComponent'
              didConfirmFileDiff={this.didConfirmStagedFileDiff.bind(this)}
              fileDiffs={this.modelData.stagedFileDiffs} />
          </div>
          <div className="git-Panel-item is-flexible git-UnstagedChanges">
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FileDiffListComponent
              ref='unstagedChangesComponent'
              didConfirmFileDiff={this.didConfirmUnstagedFileDiff.bind(this)}
              fileDiffs={this.modelData.unstagedFileDiffs} />
          </div>
        </div>
      )
    }
  }
}
