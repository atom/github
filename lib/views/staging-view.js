/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchListView from './file-patch-list-view'
import MultiList from '../multi-list'

export const ListTypes = {
  STAGED: Symbol('LIST_STAGED'),
  UNSTAGED: Symbol('LIST_UNSTAGED')
}

const ListNames = {
  [ListTypes.STAGED]: 'staged',
  [ListTypes.UNSTAGED]: 'unstaged'
}

export default class StagingView {
  constructor (props) {
    this.props = props
    this.selectStagedFilePatch = this.selectStagedFilePatch.bind(this)
    this.selectUnstagedFilePatch = this.selectUnstagedFilePatch.bind(this)
    this.multiList = new MultiList([this.props.unstagedChanges, this.props.stagedChanges])
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.selectPreviousFilePatch.bind(this),
      'core:move-down': this.selectNextFilePatch.bind(this),
      'core:confirm': this.toggleSelectedFilePatchStagingState.bind(this),
      'git:focus-unstaged-changes': () => this.selectList(ListTypes.UNSTAGED),
      'git:focus-staged-changes': () => this.selectList(ListTypes.STAGED)
    })
  }

  update (props) {
    this.props = props
    this.multiList.updateLists([this.props.unstagedChanges, this.props.stagedChanges])
    return etch.update(this)
  }

  selectList (list) {
    const listIndex = list === ListTypes.UNSTAGED ? 0 : 1
    if (this.multiList.getListAtIndex(listIndex).length) {
      this.multiList.selectListAtIndex(listIndex)
    }
    return etch.update(this)
  }

  toggleSelectedFilePatchStagingState () {
    const filePatch = this.multiList.getSelectedItem()
    if (this.getSelectedList() === ListTypes.STAGED) {
      return this.props.unstageFilePatch(filePatch)
    } else {
      return this.props.stageFilePatch(filePatch)
    }
  }

  getSelectedList () {
    return this.multiList.getSelectedListIndex() === 0 ? ListTypes.UNSTAGED : ListTypes.STAGED
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
      <div className={`git-StagingView ${ListNames[selectedList]}-changes-focused`} style={{width: 200}} tabIndex='-1'>
        <div className={`git-StagingView-group git-UnstagedChanges ${unstagedClassName}`}>
          <header className='git-StagingView-header'>Unstaged Changes</header>
          <FilePatchListView
            ref='unstagedChangesView'
            didSelectFilePatch={this.selectUnstagedFilePatch}
            toggleFilePatchStagingState={this.props.stageFilePatch}
            filePatches={this.multiList.getListAtIndex(0)}
            selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(0)} />
        </div>
        <div className={`git-StagingView-group git-StagedChanges ${stagedClassName}`}>
          <header className='git-StagingView-header'>Staged Changes</header>
          <FilePatchListView
            ref='stagedChangesView'
            didSelectFilePatch={this.selectStagedFilePatch}
            toggleFilePatchStagingState={this.props.unstageFilePatch}
            filePatches={this.multiList.getListAtIndex(1)}
            selectedFilePatchIndex={this.multiList.getSelectedItemIndexForList(1)} />
        </div>
      </div>
    )
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }
}
