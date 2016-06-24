/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FileDiffListComponent from './file-diff-list-component'

export default class StagingComponent {
  constructor ({repository, didSelectFileDiff}) {
    this.setRepository(repository)
    this.didSelectFileDiff = didSelectFileDiff || function () {}
    this.focusedList = 'unstaged'
    this.stagedSelectedFileDiff = null
    this.unstagedSelectedFileDiff = null
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.didSelectPreviousFileDiff.bind(this),
      'core:move-down': this.didSelectNextFileDiff.bind(this),
      'core:confirm': () => { this.lastRepositoryStagePromise = this.didConfirmFileDiff() }
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
    const stagedFileDiffs = await this.repository.getStagedChanges()
    const unstagedFileDiffs = await this.repository.getUnstagedChanges()
    this.modelData = {stagedFileDiffs, unstagedFileDiffs}
    if (!this.stagedSelectedFileDiff) {
      this.stagedSelectedFileDiff = stagedFileDiffs[0]
    }
    if (!this.unstagedSelectedFileDiff) {
      this.unstagedSelectedFileDiff = unstagedFileDiffs[0]
    }
    return etch.update(this)
  }

  didConfirmStagedFileDiff (fileDiff) {
    return this.repository.unstageFileDiff(fileDiff)
  }

  didConfirmUnstagedFileDiff (fileDiff) {
    return this.repository.stageFileDiff(fileDiff)
  }

  didConfirmFileDiff () {
    if (this.focusedList === 'staged') {
      return this.didConfirmStagedFileDiff(this.stagedSelectedFileDiff)
    } else {
      return this.didConfirmUnstagedFileDiff(this.unstagedSelectedFileDiff)
    }
  }

  didSelectStagedFileDiff (fileDiff) {
    this.focusedList = 'staged'
    this.stagedSelectedFileDiff = fileDiff
    this.didSelectFileDiff(fileDiff, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFileDiff (fileDiff) {
    this.focusedList = 'unstaged'
    this.unstagedSelectedFileDiff = fileDiff
    this.didSelectFileDiff(fileDiff, 'unstaged')
    return etch.update(this)
  }

  didSelectPreviousFileDiff () {
    const list = this.focusedList
    const currentSelectedFileDiff = this[list + 'SelectedFileDiff']
    const fileDiffs = this.modelData[list + 'FileDiffs']
    let index = fileDiffs.indexOf(currentSelectedFileDiff) - 1
    if (index < 0) index = fileDiffs.length - 1
    if (list === 'staged') {
      this.didSelectStagedFileDiff(fileDiffs[index])
    } else {
      this.didSelectUnstagedFileDiff(fileDiffs[index])
    }
  }

  didSelectNextFileDiff () {
    const list = this.focusedList
    const currentSelectedFileDiff = this[list + 'SelectedFileDiff']
    const fileDiffs = this.modelData[list + 'FileDiffs']
    let index = fileDiffs.indexOf(currentSelectedFileDiff) + 1
    if (index >= fileDiffs.length) index = 0
    if (list === 'staged') {
      this.didSelectStagedFileDiff(fileDiffs[index])
    } else {
      this.didSelectUnstagedFileDiff(fileDiffs[index])
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
            <FileDiffListComponent
              ref='stagedChangesComponent'
              didSelectFileDiff={this.didSelectStagedFileDiff.bind(this)}
              didConfirmFileDiff={this.didConfirmStagedFileDiff.bind(this)}
              fileDiffs={this.modelData.stagedFileDiffs}
              selectedFileDiff={this.stagedSelectedFileDiff} />
          </div>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`} >
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FileDiffListComponent
              ref='unstagedChangesComponent'
              didSelectFileDiff={this.didSelectUnstagedFileDiff.bind(this)}
              didConfirmFileDiff={this.didConfirmUnstagedFileDiff.bind(this)}
              fileDiffs={this.modelData.unstagedFileDiffs}
              selectedFileDiff={this.unstagedSelectedFileDiff} />
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
