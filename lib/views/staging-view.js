/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import ListView from './list-view'
import FilePatch from '../models/file-patch'
import MergeConflict from '../models/merge-conflict'
import FilePatchListItemView from './file-patch-list-item-view'
import MergeConflictListItemView from './merge-conflict-list-item-view'
import MultiListCollection from '../multi-list-collection'

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
    this.didSelectItem = this.didSelectItem.bind(this)
    this.selectItem = this.selectItem.bind(this)
    this.addMergeConflictFileToIndex = this.addMergeConflictFileToIndex.bind(this)
    this.stageFilePatch = this.stageFilePatch.bind(this)
    this.unstageFilePatch = this.unstageFilePatch.bind(this)
    this.multiList = new MultiListCollection([
      { key: ListTypes.UNSTAGED, items: this.props.unstagedChanges },
      { key: ListTypes.CONFLICTS, items: this.props.mergeConflicts || [] },
      { key: ListTypes.STAGED, items: this.props.stagedChanges }
    ], this.didSelectItem)
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.selectPreviousFilePatch.bind(this),
      'core:move-down': this.selectNextFilePatch.bind(this),
      'core:confirm': this.confirmSelectedItems.bind(this),
      'git:focus-next-list': this.focusNextList.bind(this),
      'git:focus-previous-list': this.focusPreviousList.bind(this)
    })
  }

  update (props) {
    this.props = props
    this.multiList.updateLists([
      { key: ListTypes.UNSTAGED, items: this.props.unstagedChanges },
      { key: ListTypes.CONFLICTS, items: this.props.mergeConflicts || [] },
      { key: ListTypes.STAGED, items: this.props.stagedChanges }
    ])
    return etch.update(this)
  }

  selectList (listKey) {
    if (this.multiList.getItemsForKey(listKey).length) {
      this.multiList.selectKeys([listKey])
    }
    return etch.update(this)
  }

  focusNextList () {
    this.multiList.selectNextList({wrap: true})
    return etch.update(this)
  }

  focusPreviousList () {
    this.multiList.selectPreviousList({wrap: true})
    return etch.update(this)
  }

  confirmSelectedItems () {
    const items = this.multiList.getSelectedItems()
    const listKey = this.getSelectedListKey()
    if (listKey === ListTypes.STAGED) {
      return Array.from(items).map(item => this.unstageFilePatch(item))
    } else {
      return Array.from(items).map(item => this.stageFilePatch(item))
    }
  }

  getSelectedListKey () {
    return this.multiList.getLastSelectedListKey()
  }

  addMergeConflictFileToIndex (mergeConflict) {
    return this.props.stageFile(mergeConflict.getPath())
  }

  stageFilePatch (filePatch) {
    return this.props.stageFile(filePatch.getPath())
  }

  unstageFilePatch (filePatch) {
    return this.props.unstageFile(filePatch.getPath())
  }

  selectPreviousFilePatch () {
    this.multiList.selectPreviousItem()
    return etch.update(this)
  }

  selectNextFilePatch () {
    this.multiList.selectNextItem()
    return etch.update(this)
  }

  selectItem (item) {
    this.multiList.selectItems([item])
    return etch.update(this)
  }

  didSelectItem (item, listKey) {
    if (!item) return
    if (item.constructor === FilePatch && this.props.didSelectFilePatch) {
      const listName = ListNames[listKey]
      this.props.didSelectFilePatch(item, listName)
    } else if (item.constructor === MergeConflict && this.props.didSelectMergeConflictFile) {
      this.props.didSelectMergeConflictFile(item.getPath())
    }
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
    const selectedList = this.getSelectedListKey()
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
        <ListView
          className='git-FilePatchListView'
          ref='mergeConflictListView'
          didSelectItem={this.selectItem}
          didConfirmItem={this.addMergeConflictFileToIndex}
          items={this.multiList.getItemsForKey(ListTypes.CONFLICTS)}
          selectedItems={this.multiList.getSelectedItems()}
          renderItem={this.renderMergeConflictListItem}
        />
      </div>
    )

    return (
      <div className={`git-StagingView ${ListNames[selectedList]}-changes-focused`} style={{width: 200}} tabIndex='-1'>
        <div className={`git-StagingView-group git-UnstagedChanges ${unstagedClassName}`}>
          <header className='git-StagingView-header'>Unstaged Changes</header>
          <ListView
            className='git-FilePatchListView'
            ref='unstagedChangesView'
            didSelectItem={this.selectItem}
            didConfirmItem={this.stageFilePatch}
            items={this.multiList.getItemsForKey(ListTypes.UNSTAGED)}
            selectedItems={this.multiList.getSelectedItems()}
            renderItem={this.renderFilePatchListItem}
          />
        </div>
        { this.multiList.getItemsForKey(ListTypes.CONFLICTS).length ? mergeConflictsView : <noscript /> }
        <div className={`git-StagingView-group git-StagedChanges ${stagedClassName}`}>
          <header className='git-StagingView-header'>Staged Changes</header>
          <ListView
            className='git-FilePatchListView'
            ref='stagedChangesView'
            didSelectItem={this.selectItem}
            didConfirmItem={this.unstageFilePatch}
            items={this.multiList.getItemsForKey(ListTypes.STAGED)}
            selectedItems={this.multiList.getSelectedItems()}
            renderItem={this.renderFilePatchListItem}
          />
        </div>
      </div>
    )
  }

  renderFilePatchListItem (filePatch, selected, handleItemClickEvent) {
    return <FilePatchListItemView filePatch={filePatch} selected={selected} onclick={handleItemClickEvent} />
  }

  renderMergeConflictListItem (mergeConflict, selected, handleItemClickEvent) {
    return <MergeConflictListItemView mergeConflict={mergeConflict} selected={selected} onclick={handleItemClickEvent} />
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }

  focus () {
    this.element.focus()
  }

  isFocused () {
    return document.activeElement === this.element
  }
}
