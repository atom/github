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
      return <a ref='changedFiles' style={{display: 'none'}} />
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
        <a
          ref='changedFiles'
          className='inline-block icon icon-diff'
          onclick={this.didClickChangedFiles}>{changedFilesLabel}</a>
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
    const uniqueChanges = new Set()
    for (let change of await this.repository.getStagedChanges()) {
      uniqueChanges.add(change.getId())
    }
    for (let change of await this.repository.getUnstagedChanges()) {
      uniqueChanges.add(change.getId())
    }
    this.changedFilesCount = uniqueChanges.size
    return etch.update(this)
  }
}
