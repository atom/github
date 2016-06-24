/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListComponent from './file-patch-list-component'

export default class StagingComponent {
  constructor ({repository, didSelectFilePatch}) {
    this.setRepository(repository)
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.focusedList = 'unstaged'
    this.stagedSelectedFilePatch = null
    this.unstagedSelectedFilePatch = null
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.didSelectPreviousFilePatch.bind(this),
      'core:move-down': this.didSelectNextFilePatch.bind(this),
      'core:confirm': () => { this.lastRepositoryStagePromise = this.didConfirmFilePatch() }
    })
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
    const stagedFilePatches = await this.repository.getStagedChanges()
    const unstagedFilePatches = await this.repository.getUnstagedChanges()
    this.modelData = {stagedFilePatches, unstagedFilePatches}
    if (!this.stagedSelectedFilePatch) {
      this.stagedSelectedFilePatch = stagedFilePatches[0]
    }
    if (!this.unstagedSelectedFilePatch) {
      this.unstagedSelectedFilePatch = unstagedFilePatches[0]
    }
    return etch.update(this)
  }

  didConfirmStagedFilePatch (filePatch) {
    return this.repository.applyPatchToIndex(filePatch.getUnstagePatch())
  }

  didConfirmUnstagedFilePatch (filePatch) {
    return this.repository.applyPatchToIndex(filePatch)
  }

  didConfirmFilePatch () {
    if (this.focusedList === 'staged') {
      return this.didConfirmStagedFilePatch(this.stagedSelectedFilePatch)
    } else {
      return this.didConfirmUnstagedFilePatch(this.unstagedSelectedFilePatch)
    }
  }

  didSelectStagedFilePatch (filePatch) {
    this.focusedList = 'staged'
    this.stagedSelectedFilePatch = filePatch
    this.didSelectFilePatch(filePatch, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFilePatch (filePatch) {
    this.focusedList = 'unstaged'
    this.unstagedSelectedFilePatch = filePatch
    this.didSelectFilePatch(filePatch, 'unstaged')
    return etch.update(this)
  }

  didSelectPreviousFilePatch () {
    const list = this.focusedList
    const currentSelectedFilePatch = this[list + 'SelectedFilePatch']
    const filePatches = this.modelData[list + 'FilePatches']
    let index = filePatches.indexOf(currentSelectedFilePatch) - 1
    if (index < 0) index = filePatches.length - 1
    if (list === 'staged') {
      this.didSelectStagedFilePatch(filePatches[index])
    } else {
      this.didSelectUnstagedFilePatch(filePatches[index])
    }
  }

  didSelectNextFilePatch () {
    const list = this.focusedList
    const currentSelectedFilePatch = this[list + 'SelectedFilePatch']
    const filePatches = this.modelData[list + 'FilePatches']
    let index = filePatches.indexOf(currentSelectedFilePatch) + 1
    if (index >= filePatches.length) index = 0
    if (list === 'staged') {
      this.didSelectStagedFilePatch(filePatches[index])
    } else {
      this.didSelectUnstagedFilePatch(filePatches[index])
    }
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
        <div className="git-StagingComponent" style={{width: 200}} tabIndex="-1">
          <div className={`git-Panel-item is-flexible git-StagedChanges ${stagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Staged Changes</header>
            <FilePatchListComponent
              ref='stagedChangesComponent'
              didSelectFilePatch={this.didSelectStagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmStagedFilePatch.bind(this)}
              filePatches={this.modelData.stagedFilePatches}
              selectedFilePatch={this.stagedSelectedFilePatch} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`} >
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FilePatchListComponent
              ref='unstagedChangesComponent'
              didSelectFilePatch={this.didSelectUnstagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmUnstagedFilePatch.bind(this)}
              filePatches={this.modelData.unstagedFilePatches}
              selectedFilePatch={this.unstagedSelectedFilePatch} />
          </div>
        </div>
      )
    }
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }
}
