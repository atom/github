/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListComponent from './file-patch-list-component'

export default class StagingComponent {
  constructor ({repository, didSelectFilePatch}) {
    this.setRepository(repository)
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.focusedList = 'staged'
    this.stagedSelectedFilePatch = null
    this.unstagedSelectedFilePatch = null
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.didSelectPreviousFilePatch.bind(this),
      'core:move-down': this.didSelectNextFilePatch.bind(this),
      'core:confirm': () => { this.lastRepositoryStagePromise = this.didConfirmFilePatch() },
      'git:focus-unstaged-changes': () => this.didSelectUnstagedFilePatch(),
      'git:focus-staged-changes': () => this.didSelectStagedFilePatch()
    })
  }

  update ({repository}) {
    this.setRepository(repository)
    return etch.update(this)
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
    if (filePatch) this.stagedSelectedFilePatch = filePatch
    this.focusedList = 'staged'
    this.didSelectFilePatch(this.stagedSelectedFilePatch, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFilePatch (filePatch) {
    if (filePatch) this.unstagedSelectedFilePatch = filePatch
    this.focusedList = 'unstaged'
    this.didSelectFilePatch(this.unstagedSelectedFilePatch, 'unstaged')
    return etch.update(this)
  }

  didSelectPreviousFilePatch () {
    const list = this.focusedList
    if (list === 'staged') {
      this.didSelectPreviousStagedFilePatch()
    } else {
      this.didSelectPreviousUnstagedFilePatch()
    }
  }

  didSelectPreviousStagedFilePatch () {
    const currentSelectedFilePatch = this.stagedSelectedFilePatch
    const filePatches = this.modelData.stagedFilePatches
    let index = filePatches.indexOf(currentSelectedFilePatch) - 1
    if (index < 0) {
      this.didSelectLastFilePatch('unstaged')
    } else {
      this.didSelectStagedFilePatch(filePatches[index])
    }
  }

  didSelectPreviousUnstagedFilePatch () {
    const currentSelectedFilePatch = this.unstagedSelectedFilePatch
    const filePatches = this.modelData.unstagedFilePatches
    let index = filePatches.indexOf(currentSelectedFilePatch) - 1
    if (index < 0) {
      this.didSelectLastFilePatch('staged')
    } else {
      this.didSelectUnstagedFilePatch(filePatches[index])
    }
  }

  didSelectNextFilePatch () {
    const list = this.focusedList
    if (list === 'staged') {
      this.didSelectNextStagedFilePatch()
    } else {
      this.didSelectNextUnstagedFilePatch()
    }
  }

  didSelectNextStagedFilePatch () {
    const currentSelectedFilePatch = this.stagedSelectedFilePatch
    const filePatches = this.modelData.stagedFilePatches
    let index = filePatches.indexOf(currentSelectedFilePatch) + 1
    if (index >= filePatches.length) {
      this.didSelectFirstFilePatch('unstaged')
    } else {
      this.didSelectStagedFilePatch(filePatches[index])
    }
  }

  didSelectNextUnstagedFilePatch () {
    const currentSelectedFilePatch = this.unstagedSelectedFilePatch
    const filePatches = this.modelData.unstagedFilePatches
    let index = filePatches.indexOf(currentSelectedFilePatch) + 1
    if (index >= filePatches.length) {
      this.didSelectFirstFilePatch('staged')
    } else {
      this.didSelectUnstagedFilePatch(filePatches[index])
    }
  }

  didSelectFirstFilePatch (list) {
    if (list === 'staged') {
      this.didSelectStagedFilePatch(this.modelData.stagedFilePatches[0])
    } else {
      this.didSelectUnstagedFilePatch(this.modelData.unstagedFilePatches[0])
    }
  }

  didSelectLastFilePatch (list) {
    if (list === 'staged') {
      const stagedFilePatches = this.modelData.stagedFilePatches
      this.didSelectStagedFilePatch(stagedFilePatches[stagedFilePatches.length - 1])
    } else {
      const unstagedFilePatches = this.modelData.unstagedFilePatches
      this.didSelectUnstagedFilePatch(unstagedFilePatches[unstagedFilePatches.length - 1])
    }
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
        <div className={`git-StagingComponent ${this.focusedList + '-changes-focused'}`} style={{width: 200}} tabIndex='-1'>
          <div className={`git-Panel-item is-flexible git-StagedChanges ${stagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Staged Changes</header>
            <FilePatchListComponent
              ref='stagedChangesComponent'
              didSelectFilePatch={this.didSelectStagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmStagedFilePatch.bind(this)}
              filePatches={this.modelData.stagedFilePatches}
              selectedFilePatch={this.stagedSelectedFilePatch} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`}>
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
