/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FileDiffListComponent from './file-diff-list-component'

export default class StagingComponent {
  constructor ({repository, didSelectFileDiff}) {
    this.setRepository(repository)
    this.didSelectFileDiff = didSelectFileDiff || function () {}
    this.focusedList = 'unstaged'
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
        this.repositorySubscription = repository.onDidUpdate(this.refreshModelData.bind(this))
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

  didSelectStagedFileDiff (fileDiff) {
    this.focusedList = 'staged'
    this.didSelectFileDiff(fileDiff, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFileDiff (fileDiff) {
    this.focusedList = 'unstaged'
    this.didSelectFileDiff(fileDiff, 'unstaged')
    return etch.update(this)
  }

  update ({repository}) {
    this.setRepository(repository)
    return etch.update(this)
  }

  render () {
    if (this.modelData == null) {
      return <div />
    } else {
      let stagedClassName, unstagedClassName
      if (this.focusedList === 'staged') {
        stagedClassName = 'is-focused'
        unstagedClassName = ''
      } else {
        stagedClassName = ''
        unstagedClassName = 'is-focused'
      }
      return (
        <div className="git-StagingComponent" style={{width: 200}}>
          <div className={`git-Panel-item is-flexible git-StagedChanges ${stagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Staged Changes</header>
            <FileDiffListComponent
              ref='stagedChangesComponent'
              didSelectFileDiff={this.didSelectStagedFileDiff.bind(this)}
              didConfirmFileDiff={this.didConfirmStagedFileDiff.bind(this)}
              fileDiffs={this.modelData.stagedFileDiffs} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FileDiffListComponent
              ref='unstagedChangesComponent'
              didSelectFileDiff={this.didSelectUnstagedFileDiff.bind(this)}
              didConfirmFileDiff={this.didConfirmUnstagedFileDiff.bind(this)}
              fileDiffs={this.modelData.unstagedFileDiffs} />
          </div>
        </div>
      )
    }
  }
}
