/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListComponent from './file-patch-list-component'

export default class StagingComponent {
  constructor ({repository, didSelectFilePatch}) {
    this.setRepository(repository)
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.focusedList = 'staged'
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
      stagedFilePatches: await this.repository.getStagedChanges(),
      unstagedFilePatches: await this.repository.getUnstagedChanges()
    }
    return etch.update(this)
  }

  async didConfirmStagedFilePatch (filePatch) {
    await this.repository.applyPatchToIndex(filePatch.getUnstagePatch())
  }

  async didConfirmUnstagedFilePatch (filePatch) {
    await this.repository.applyPatchToIndex(filePatch)
  }

  didSelectStagedFilePatch (filePatch) {
    this.focusedList = 'staged'
    this.didSelectFilePatch(filePatch, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFilePatch (filePatch) {
    this.focusedList = 'unstaged'
    this.didSelectFilePatch(filePatch, 'unstaged')
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
            <FilePatchListComponent
              ref='stagedChangesComponent'
              didSelectFilePatch={this.didSelectStagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmStagedFilePatch.bind(this)}
              fileDiffs={this.modelData.stagedFilePatches} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FilePatchListComponent
              ref='unstagedChangesComponent'
              didSelectFilePatch={this.didSelectUnstagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmUnstagedFilePatch.bind(this)}
              fileDiffs={this.modelData.unstagedFilePatches} />
          </div>
        </div>
      )
    }
  }
}
