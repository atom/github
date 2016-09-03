/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {Disposable} from 'atom'

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
    this.stageFilePatch = this.stageFilePatch.bind(this)
    this.unstageFilePatch = this.unstageFilePatch.bind(this)
    this.enableSelections = this.enableSelections.bind(this)
    this.disableSelections = this.disableSelections.bind(this)
    this.renderFilePatchListItem = this.renderFilePatchListItem.bind(this)
    this.renderMergeConflictListItem = this.renderMergeConflictListItem.bind(this)
    this.multiListCollection = new MultiListCollection([
      { key: ListTypes.UNSTAGED, items: this.props.unstagedChanges },
      { key: ListTypes.CONFLICTS, items: this.props.mergeConflicts || [] },
      { key: ListTypes.STAGED, items: this.props.stagedChanges }
    ], this.didSelectItem)
    etch.initialize(this)

    this.subscriptions = atom.commands.add(this.element, {
      'core:move-up': this.selectPreviousFilePatch.bind(this),
      'core:move-down': this.selectNextFilePatch.bind(this),
      'core:select-up': this.selectPreviousFilePatch.bind(this, {addToExisting: true, stopAtBounds: true}),
      'core:select-down': this.selectNextFilePatch.bind(this, {addToExisting: true, stopAtBounds: true}),
      'core:confirm': this.confirmSelectedItems.bind(this),
      'git:focus-next-list': this.focusNextList.bind(this),
      'git:focus-previous-list': this.focusPreviousList.bind(this),
      'git:focus-diff-view': this.focusFilePatchView.bind(this)
    })
    window.addEventListener('mouseup', this.disableSelections)
    this.subscriptions.add(new Disposable(() => window.removeEventListener('mouseup', this.disableSelections)))
  }

  update (props) {
    this.props = props
    this.multiListCollection.updateLists([
      { key: ListTypes.UNSTAGED, items: this.props.unstagedChanges },
      { key: ListTypes.CONFLICTS, items: this.props.mergeConflicts || [] },
      { key: ListTypes.STAGED, items: this.props.stagedChanges }
    ])
    return etch.update(this)
  }

  enableSelections () {
    this.validItems = new Set(this.multiListCollection.getItemsForKey(this.getSelectedListKey()))
    this.selectionEnabled = true
    return etch.update(this)
  }

  disableSelections () {
    this.tail = null
    this.validItems = null
    this.selectionEnabled = false
    return etch.update(this)
  }

  selectList (listKey) {
    if (this.multiListCollection.getItemsForKey(listKey).length) {
      this.multiListCollection.selectKeys([listKey])
    }
    this.enableSelections()
    return etch.update(this)
  }

  focusNextList () {
    this.multiListCollection.selectNextList({wrap: true})
    return etch.update(this)
  }

  focusPreviousList () {
    this.multiListCollection.selectPreviousList({wrap: true})
    return etch.update(this)
  }

  confirmSelectedItems () {
    this.disableSelections()
    const itemPaths = Array.from(this.getSelectedItems()).map(item => item.getPath())
    const listKey = this.getSelectedListKey()
    if (listKey === ListTypes.STAGED) {
      return this.props.unstageFiles(itemPaths)
    } else {
      return this.props.stageFiles(itemPaths)
    }
  }

  getSelectedListKey () {
    return this.multiListCollection.getLastSelectedListKey()
  }

  getSelectedItems () {
    return this.multiListCollection.getSelectedItems()
  }

  stageFilePatch (filePatch) {
    return this.props.stageFiles([filePatch.getPath()])
  }

  unstageFilePatch (filePatch) {
    return this.props.unstageFiles([filePatch.getPath()])
  }

  selectPreviousFilePatch (options = {}) {
    this.multiListCollection.selectPreviousItem(options)
    return etch.update(this)
  }

  selectNextFilePatch (options = {}) {
    this.multiListCollection.selectNextItem(options)
    return etch.update(this)
  }

  selectItem (item) {
    if (!this.validItems.has(item)) return
    const selectedList = this.getSelectedListKey()
    if (!this.tail) this.tail = {key: selectedList, item}
    this.head = {key: selectedList, item}
    this.multiListCollection.selectItemsAndKeysInRange(this.tail, this.head)
    return etch.update(this)
  }

  didSelectItem (item, listKey, {focus} = {}) {
    if (!item || !this.isFocused()) return
    if (item.constructor === FilePatch && this.props.didSelectFilePatch) {
      const listName = ListNames[listKey]
      this.props.didSelectFilePatch(item, listName, {focus})
    } else if (item.constructor === MergeConflict && this.props.didSelectMergeConflictFile) {
      this.props.didSelectMergeConflictFile(item.getPath(), {focus})
    }
  }

  focusFilePatchView () {
    const item = this.multiListCollection.getLastSelectedItem()
    const listKey = this.multiListCollection.getLastSelectedListKey()
    this.didSelectItem(item, listKey, {focus: true})
  }

  buildDebugData () {
    const getPath = (fp) => fp ? fp.getNewPath() : '<none>'
    const multiListData = this.multiListCollection.toObject()
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
      <div className={`git-StagingView-group git-MergeConflictPaths ${conflictsClassName}`}
          onmousedown={() => this.selectList(ListTypes.CONFLICTS) } >
        <header className='git-StagingView-header'>
          <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
          Merge Conflicts
          <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
        </header>
        <ListView
          className='git-StagingView-list git-FilePatchListView'
          ref='mergeConflictListView'
          didConfirmItem={this.stageFilePatch}
          items={this.multiListCollection.getItemsForKey(ListTypes.CONFLICTS)}
          selectedItems={this.getSelectedItems()}
          renderItem={this.renderMergeConflictListItem}
        />
      </div>
    )

    return (
      <div className={`git-StagingView ${ListNames[selectedList]}-changes-focused`} style={{width: 200}} tabIndex='-1'
           onmouseup={() => this.disableSelections()}>
        <div className={`git-StagingView-group git-UnstagedChanges ${unstagedClassName}`}
            onmousedown={() => this.selectList(ListTypes.UNSTAGED)} >
          <header className='git-StagingView-header'>
            <span className="icon icon-diff">Unstaged Changes</span>
          </header>
          <ListView
            className='git-StagingView-list git-FilePatchListView'
            ref='unstagedChangesView'
            didConfirmItem={this.stageFilePatch}
            items={this.multiListCollection.getItemsForKey(ListTypes.UNSTAGED)}
            selectedItems={this.getSelectedItems()}
            renderItem={this.renderFilePatchListItem}
          />
        </div>
        { this.multiListCollection.getItemsForKey(ListTypes.CONFLICTS).length ? mergeConflictsView : <noscript /> }
        <div className={`git-StagingView-group git-StagedChanges ${stagedClassName}`}
            onmousedown={() => this.selectList(ListTypes.STAGED)} >
          <header className='git-StagingView-header'>
            <span className="icon icon-checklist">Staged Changes</span>
          </header>
          <ListView
            className='git-StagingView-list git-FilePatchListView'
            ref='stagedChangesView'
            didConfirmItem={this.unstageFilePatch}
            items={this.multiListCollection.getItemsForKey(ListTypes.STAGED)}
            selectedItems={this.getSelectedItems()}
            renderItem={this.renderFilePatchListItem}
          />
        </div>
      </div>
    )
  }

  renderFilePatchListItem (filePatch, selected, handleItemClickEvent) {
    return (
      <FilePatchListItemView
        filePatch={filePatch}
        selected={selected}
        onclick={handleItemClickEvent}
        selectionEnabled={this.selectionEnabled}
        selectItem={this.selectItem}
      />
    )
  }

  renderMergeConflictListItem (mergeConflict, selected, handleItemClickEvent) {
    return (
      <MergeConflictListItemView
        mergeConflict={mergeConflict}
        selected={selected}
        onclick={handleItemClickEvent}
        selectionEnabled={this.selectionEnabled}
        selectItem={this.selectItem}
      />
    )
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
