/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class StatusBarView {
  constructor ({repository, didClickChangedFiles}) {
    this.didClickChangedFiles = didClickChangedFiles
    etch.initialize(this)
    this.setRepository(repository)
  }

  update ({repository, didClickChangedFiles}) {
    this.didClickChangedFiles = didClickChangedFiles
    return this.setRepository(repository)
  }

  render () {
    if (this.repository == null || this.changedFilesCount == null) {
      return (
        <div className='git-StatusBar'>
          <span ref='changedFiles' style={{display: 'none'}} />
        </div>
      )
    } else {
      let changedFilesLabel = ''
      if (this.changedFilesCount === 0) {
        changedFilesLabel = 'No changes.'
      } else if (this.changedFilesCount === 1) {
        changedFilesLabel = '1 file changed.'
      } else {
        changedFilesLabel = `${this.changedFilesCount} files changed.`
      }
      return (
        <div className='git-StatusBar'>
          <span ref='changedFiles' onclick={this.didClickChangedFiles}>{changedFilesLabel}</span>
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
      return etch.update(this)
    }
  }

  async refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh () {
    if (!this.repository) return
    const stagedChanges = await this.repository.getStagedChanges()
    const unstagedChanges = await this.repository.getUnstagedChanges()
    this.changedFilesCount = stagedChanges.length + unstagedChanges.length
    return etch.update(this)
  }
}
