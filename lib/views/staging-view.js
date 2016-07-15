/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListView from './file-patch-list-view'
import MergeConflictListView from './merge-conflict-list-view'
import MultiList from '../multi-list'

export const ListTypes = {
  STAGED: Symbol('LIST_STAGED'),
  UNSTAGED: Symbol('LIST_UNSTAGED'),
  CONFLICTS: Symbol('LIST_CONFLICTS')
}

const ListNames = {
  [ListTypes.STAGED]: 'staged',
  [ListTypes.UNSTAGED]: 'unstaged',
  [ListTypes.CONFLICTS]: 'conflicts'
}

export default class StagingView {
  constructor (props) {
    this.props = props
    this.selectStagedFilePatch = this.selectStagedFilePatch.bind(this)
    this.selectUnstagedFilePatch = this.selectUnstagedFilePatch.bind(this)
    this.selectMergeConflictFile = this.selectMergeConflictFile.bind(this)
    this.addMergeConflictFileToIndex = this.addMergeConflictFileToIndex.bind(this)
    this.multiList = new MultiList([this.props.unstagedChanges, this.props.mergeConflicts || [], this.props.stagedChanges])
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.selectPreviousFilePatch.bind(this),
      'core:move-down': this.selectNextFilePatch.bind(this),
      'core:confirm': this.toggleSelectedFilePatchStagingState.bind(this),
      'git:focus-unstaged-changes': () => this.selectList(ListTypes.UNSTAGED),
      'git:focus-staged-changes': () => this.selectList(ListTypes.STAGED),
      'git:focus-merge-conflicts': () => this.selectList(ListTypes.CONFLICTS)
    })
  }

  update (props) {
    this.props = props
    this.multiList.updateLists([this.props.unstagedChanges, this.props.mergeConflicts || [], this.props.stagedChanges])
    return etch.update(this)
  }

  selectList (list) {
    let listIndex
    if (list === ListTypes.UNSTAGED) {
      listIndex = 0
    } else if (list === ListTypes.CONFLICTS) {
      listIndex = 1
    } else if (list === ListTypes.STAGED) {
      listIndex = 2
    }
    if (this.multiList.getListAtIndex(listIndex).length) {
      this.multiList.selectListAtIndex(listIndex)
    }
    return etch.update(this)
  }

  toggleSelectedFilePatchStagingState () {
    const filePatch = this.multiList.getSelectedItem()
    if (this.getSelectedList() === ListTypes.STAGED) {
      return this.props.unstageFilePatch(filePatch)
    } else if (this.getSelectedList() === ListTypes.UNSTAGED) {
      return this.props.stageFilePatch(filePatch)
    } else if (this.getSelectedList() === ListTypes.CONFLICTS) {
      return this.addMergeConflictFileToIndex(filePatch)
    }
  }

  getSelectedList () {
    const index = this.multiList.getSelectedListIndex()
    if (index === 0) {
      return ListTypes.UNSTAGED
    } else if (index === 1) {
      return ListTypes.CONFLICTS
    } else if (index === 2) {
      return ListTypes.STAGED
    }
  }

  selectStagedFilePatch (filePatch) {
    this.multiList.selectItem(filePatch)
    if (this.props.didSelectFilePatch) this.props.didSelectFilePatch(filePatch, 'staged')
    return etch.update(this)
  }

  selectUnstagedFilePatch (filePatch) {
    this.multiList.selectItem(filePatch)
    if (this.props.didSelectFilePatch) this.props.didSelectFilePatch(filePatch, 'unstaged')
    return etch.update(this)
  }

  selectMergeConflictFile (mergeConflict) {
    this.multiList.selectItem(mergeConflict)
    if (this.props.didSelectMergeConflictFile) this.props.didSelectMergeConflictFile(mergeConflict.getPath())
    return etch.update(this)
  }

  addMergeConflictFileToIndex (mergeConflict) {
    return this.props.addPathToIndex(mergeConflict.getPath())
  }

  selectPreviousFilePatch () {
    this.multiList.moveItemSelection(-1)
    return etch.update(this)
  }

  selectNextFilePatch () {
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
    let stagedClassName = ''
    let unstagedClassName = ''
    let conflictsClassName = ''
    const selectedList = this.getSelectedList()
    if (selectedList === ListTypes.STAGED) {
      stagedClassName = 'is-focused'
    } else if (selectedList === ListTypes.UNSTAGED) {
      unstagedClassName = 'is-focused'
    } else if (selectedList === ListTypes.CONFLICTS) {
      conflictsClassName = 'is-focused'
    }

    const mergeConflictsView = (
      <div className={`git-StagingView-group git-MergeConflictPaths ${conflictsClassName}`}>
      <header className='git-StagingView-header'>
        <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
        Merge Conflicts
        <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
      </header>
        <MergeConflictListView
          ref='mergeConflictListView'
          didSelectItem={this.selectMergeConflictFile}
          didConfirmItem={this.addMergeConflictFileToIndex}
          items={this.multiList.getListAtIndex(1)}
          selectedIndex={this.multiList.getSelectedItemIndexForList(1)}
        />
      </div>
    )

    return (
      <div className={`git-StagingView ${ListNames[selectedList]}-changes-focused`} style={{width: 200}} tabIndex='-1'>
        <div className={`git-StagingView-group git-UnstagedChanges ${unstagedClassName}`}>
          <header className='git-StagingView-header'>Unstaged Changes</header>
          <FilePatchListView
            ref='unstagedChangesView'
            didSelectFilePatch={this.selectUnstagedFilePatch}
            toggleFilePatchStagingState={this.props.stageFilePatch}
            filePatches={this.multiList.getListAtIndex(0)}
            selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(0)}
          />
        </div>
        { this.multiList.getListAtIndex(1).length ? mergeConflictsView : <noscript /> }
        <div className={`git-StagingView-group git-StagedChanges ${stagedClassName}`}>
          <header className='git-StagingView-header'>Staged Changes</header>
          <FilePatchListView
            ref='stagedChangesView'
            didSelectFilePatch={this.selectStagedFilePatch}
            toggleFilePatchStagingState={this.props.unstageFilePatch}
            filePatches={this.multiList.getListAtIndex(2)}
            selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(2)}
          />
        </div>
      </div>
    )
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }
}
