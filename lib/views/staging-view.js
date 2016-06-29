/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListView from './file-patch-list-view'
import MultiList from 'multi-list-selection'

export const ListTypes = {
  STAGED: Symbol('LIST_STAGED'),
  UNSTAGED: Symbol('LIST_UNSTAGED')
}

const ListNames = {
  [ListTypes.STAGED]: 'staged',
  [ListTypes.UNSTAGED]: 'unstaged'
}

export default class StagingView {
  constructor ({repository, didSelectFilePatch}) {
    this.setRepository(repository)
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.multiList = null
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.didSelectPreviousFilePatch.bind(this),
      'core:move-down': this.didSelectNextFilePatch.bind(this),
      'core:confirm': this.didConfirmSelectedFilePatch.bind(this),
      'git:focus-unstaged-changes': () => this.selectList(ListTypes.UNSTAGED),
      'git:focus-staged-changes': () => this.selectList(ListTypes.STAGED)
    })
  }

  update ({repository}) {
    this.setRepository(repository)
    return etch.update(this)
  }

  setRepository (repository) {
    if (this.repository !== repository) {
      this.repository = repository
      this.multiList = null
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
    const unstagedFilePatches = await this.repository.getUnstagedChanges()
    const stagedFilePatches = await this.repository.getStagedChanges()
    if (this.multiList) {
      this.multiList.updateLists([unstagedFilePatches, stagedFilePatches])
    } else {
      this.multiList = new MultiList([unstagedFilePatches, stagedFilePatches])
    }
    return etch.update(this)
  }

  selectList (list) {
    const listIndex = list === ListTypes.UNSTAGED ? 0 : 1
    if (this.multiList.getListAtIndex(listIndex).length) {
      this.multiList.selectListAtIndex(listIndex)
    }
    return etch.update(this)
  }

  didConfirmStagedFilePatch (filePatch) {
    return this.repository.applyPatchToIndex(filePatch.getUnstagePatch())
  }

  didConfirmUnstagedFilePatch (filePatch) {
    return this.repository.applyPatchToIndex(filePatch)
  }

  didConfirmSelectedFilePatch () {
    const filePatch = this.multiList.getSelectedItem()
    if (this.getSelectedList() === ListTypes.STAGED) {
      return this.didConfirmStagedFilePatch(filePatch)
    } else {
      return this.didConfirmUnstagedFilePatch(filePatch)
    }
  }

  getSelectedList () {
    return this.multiList.getSelectedListIndex() === 0 ? ListTypes.UNSTAGED : ListTypes.STAGED
  }

  didSelectStagedFilePatch (filePatch) {
    this.multiList.selectItem(filePatch)
    this.didSelectFilePatch(filePatch, 'staged')
    return etch.update(this)
  }

  didSelectUnstagedFilePatch (filePatch) {
    this.multiList.selectItem(filePatch)
    this.didSelectFilePatch(filePatch, 'unstaged')
    return etch.update(this)
  }

  didSelectPreviousFilePatch () {
    this.multiList.moveItemSelection(-1)
    return etch.update(this)
  }

  didSelectNextFilePatch () {
    this.multiList.moveItemSelection(1)
    return etch.update(this)
  }

  buildDebugData () {
    const getPath = (fp) => fp ? fp.getNewPath() : '<none>'
    const multiListData = this.multiList.toObject()
    return {
      ...multiListData,
      lists: multiListData.lists.map(list => list.map(getPath))
    }
  }

  render () {
    if (!this.multiList) {
      return <div />
    } else {
      let stagedClassName, unstagedClassName
      const selectedList = this.getSelectedList()
      if (selectedList === ListTypes.STAGED) {
        stagedClassName = 'is-focused'
        unstagedClassName = ''
      } else {
        stagedClassName = ''
        unstagedClassName = 'is-focused'
      }
      return (
        <div className={`git-Panel-item git-StagingView ${ListNames[selectedList]}-changes-focused`} style={{width: 200}} tabIndex='-1'>
          <div className={`git-Panel-item is-flexible git-UnstagedChanges ${unstagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Unstaged Changes</header>
            <FilePatchListView
              ref='unstagedChangesView'
              didSelectFilePatch={this.didSelectUnstagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmUnstagedFilePatch.bind(this)}
              filePatches={this.multiList.getListAtIndex(0)}
              selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(0)} />
          </div>
          <div className={`git-Panel-item is-flexible git-StagedChanges ${stagedClassName}`}>
            <header className='git-CommitPanel-item is-header'>Staged Changes</header>
            <FilePatchListView
              ref='stagedChangesView'
              didSelectFilePatch={this.didSelectStagedFilePatch.bind(this)}
              didConfirmFilePatch={this.didConfirmStagedFilePatch.bind(this)}
              filePatches={this.multiList.getListAtIndex(1)}
              selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(1)} />
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
