/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListComponent from './file-patch-list-component'

const uniquePatchId = (patch) => {
  return `a/${patch.getOldPath()} b/${patch.getNewPath()}`
}

export default class StagingComponent {
  constructor ({repository, didSelectFilePatch}) {
    this.setRepository(repository)
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.focusedList = 'staged'
    this.selectedStagedFilePatch = null
    this.selectedUnstagedFilePatch = null
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
    if (!this.selectedStagedFilePatch) {
      this.selectedStagedFilePatch = stagedFilePatches[0]
    }
    if (!this.selectedUnstagedFilePatch) {
      this.selectedUnstagedFilePatch = unstagedFilePatches[0]
    }
    return etch.update(this)
  }

  async didConfirmStagedFilePatch (filePatch) {
    let index = this.modelData.stagedFilePatches.map(uniquePatchId).indexOf(uniquePatchId(filePatch))
    await this.repository.applyPatchToIndex(filePatch.getUnstagePatch())
    await this.lastModelDataRefreshPromise
    const newFilePatches = this.modelData.stagedFilePatches
    if (index >= newFilePatches.length) index--
    if (index >= 0) {
      this.didSelectStagedFilePatch(newFilePatches[index])
    } else {
      this.selectedStagedFilePatch = null
      this.didSelectFirstFilePatch('unstaged')
    }
  }

  async didConfirmUnstagedFilePatch (filePatch) {
    let index = this.modelData.unstagedFilePatches.map(uniquePatchId).indexOf(uniquePatchId(filePatch))
    await this.repository.applyPatchToIndex(filePatch)
    await this.lastModelDataRefreshPromise
    const newFilePatches = this.modelData.unstagedFilePatches
    if (index >= newFilePatches.length) index--
    if (index >= 0) {
      this.didSelectUnstagedFilePatch(newFilePatches[index])
    } else {
      this.selectedUnstagedFilePatch = null
      this.didSelectLastFilePatch('staged')
    }
  }

  didConfirmFilePatch () {
    if (this.focusedList === 'staged') {
      return this.didConfirmStagedFilePatch(this.selectedStagedFilePatch)
    } else {
      return this.didConfirmUnstagedFilePatch(this.selectedUnstagedFilePatch)
    }
  }

  didSelectStagedFilePatch (filePatch) {
    if (filePatch) this.selectedStagedFilePatch = filePatch
    this.focusedList = 'staged'
    this.didSelectFilePatch(this.selectedStagedFilePatch, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFilePatch (filePatch) {
    if (filePatch) this.selectedUnstagedFilePatch = filePatch
    this.focusedList = 'unstaged'
    this.didSelectFilePatch(this.selectedUnstagedFilePatch, 'unstaged')
    return etch.update(this)
  }

  didSelectPreviousFilePatch () {
    if (this.focusedList === 'staged') {
      this.didSelectPreviousStagedFilePatch()
    } else {
      this.didSelectPreviousUnstagedFilePatch()
    }
  }

  didSelectPreviousStagedFilePatch () {
    const currentFilePatch = this.selectedStagedFilePatch
    const filePatches = this.modelData.stagedFilePatches
    const index = filePatches.map(uniquePatchId).indexOf(uniquePatchId(currentFilePatch)) - 1
    if (index < 0) {
      this.didSelectLastFilePatch('unstaged')
    } else {
      this.didSelectStagedFilePatch(filePatches[index])
    }
  }

  didSelectPreviousUnstagedFilePatch () {
    const currentFilePatch = this.selectedUnstagedFilePatch
    const filePatches = this.modelData.unstagedFilePatches
    const index = filePatches.map(uniquePatchId).indexOf(uniquePatchId(currentFilePatch)) - 1
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
    const currentFilePatch = this.selectedStagedFilePatch
    const filePatches = this.modelData.stagedFilePatches
    const index = filePatches.map(uniquePatchId).indexOf(uniquePatchId(currentFilePatch)) + 1
    if (index >= filePatches.length) {
      this.didSelectFirstFilePatch('unstaged')
    } else {
      this.didSelectStagedFilePatch(filePatches[index])
    }
  }

  didSelectNextUnstagedFilePatch () {
    const currentFilePatch = this.selectedUnstagedFilePatch
    const filePatches = this.modelData.unstagedFilePatches
    const index = filePatches.map(uniquePatchId).indexOf(uniquePatchId(currentFilePatch)) + 1
    if (index >= filePatches.length) {
      this.didSelectFirstFilePatch('staged')
    } else {
      this.didSelectUnstagedFilePatch(filePatches[index])
    }
  }

  didSelectFirstFilePatch (list) {
    if (list === 'staged') {
      const firstStagedFilePatch = this.modelData.stagedFilePatches[0]
      if (firstStagedFilePatch) this.didSelectStagedFilePatch(firstStagedFilePatch)
    } else {
      const firstUnstagedFilePatch = this.modelData.unstagedFilePatches[0]
      if (firstUnstagedFilePatch) this.didSelectUnstagedFilePatch(firstUnstagedFilePatch)
    }
  }

  didSelectLastFilePatch (list) {
    if (list === 'staged') {
      const stagedFilePatches = this.modelData.stagedFilePatches
      const lastStagedFilePatch = stagedFilePatches[stagedFilePatches.length - 1]
      if (lastStagedFilePatch) this.didSelectStagedFilePatch(lastStagedFilePatch)
    } else {
      const unstagedFilePatches = this.modelData.unstagedFilePatches
      const lastUnstagedFilePatch = unstagedFilePatches[unstagedFilePatches.length - 1]
      if (lastUnstagedFilePatch) this.didSelectUnstagedFilePatch(lastUnstagedFilePatch)
    }
  }

  buildDebugData () {
    const getPath = (fp) => fp ? fp.getNewPath() : '<none>'
    return {
      focusedList: this.focusedList,
      selectedStagedFilePatch: getPath(this.selectedStagedFilePatch),
      selectedUnstagedFilePatch: getPath(this.selectedUnstagedFilePatch),
      stagedFilePatches: this.modelData.stagedFilePatches.map((p) => p.getNewPath()),
      unstagedFilePatches: this.modelData.unstagedFilePatches.map((p) => p.getNewPath()),
      index: index
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
              selectedFilePatch={this.selectedStagedFilePatch} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FilePatchListComponent
              ref='unstagedChangesComponent'
              didSelectFilePatch={this.didSelectUnstagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmUnstagedFilePatch.bind(this)}
              filePatches={this.modelData.unstagedFilePatches}
              selectedFilePatch={this.selectedUnstagedFilePatch} />
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
