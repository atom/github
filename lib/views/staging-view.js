/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {Disposable, CompositeDisposable} from 'atom'

import FilePatchListItemView from './file-patch-list-item-view'
import MergeConflictListItemView from './merge-conflict-list-item-view'
import CompositeListSelection from './composite-list-selection'
import {shortenSha} from '../helpers'

export default class StagingView {
  constructor (props) {
    this.props = props
    this.mouseSelectionInProgress = false
    this.listElementsByItem = new WeakMap()
    this.registerItemElement = this.registerItemElement.bind(this)
    this.mousedownOnItem = this.mousedownOnItem.bind(this)
    this.mousemoveOnItem = this.mousemoveOnItem.bind(this)
    this.mouseup = this.mouseup.bind(this)
    this.selection = new CompositeListSelection({
      listsByKey: {
        unstaged: this.props.unstagedChanges,
        conflicts: this.props.mergeConflicts || [],
        staged: this.props.stagedChanges
      },
      idForItem: item => item.getPath()
    })
    this.reportSelectedItem()
    etch.initialize(this)

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, {
      'core:move-up': () => this.selectPrevious(),
      'core:move-down': () => this.selectNext(),
      'core:select-up': () => this.selectPrevious(true),
      'core:select-down': () => this.selectNext(true),
      'core:select-all': () => this.selectAll(),
      'core:move-to-top': () => this.selectFirst(),
      'core:move-to-bottom': () => this.selectLast(),
      'core:select-to-top': () => this.selectFirst(true),
      'core:select-to-bottom': () => this.selectLast(true),
      'core:confirm': () => this.confirmSelectedItems(),
      'git:activate-next-list': () => this.activateNextList(),
      'git:activate-previous-list': () => this.activatePreviousList(),
      'git:focus-diff-view': () => this.focusFilePatchView()
    }))
    window.addEventListener('mouseup', this.mouseup)
    this.subscriptions.add(new Disposable(() => window.removeEventListener('mouseup', this.mouseup)))
  }

  update (props) {
    this.props = props
    this.selection.updateLists({
      unstaged: this.props.unstagedChanges,
      conflicts: this.props.mergeConflicts || [],
      staged: this.props.stagedChanges
    })
    return etch.update(this)
  }

  activateNextList () {
    this.selection.activateNextSelection()
    return etch.update(this)
  }

  activatePreviousList () {
    this.selection.activatePreviousSelection()
    return etch.update(this)
  }

  confirmSelectedItems () {
    const itemPaths = Array.from(this.selection.getSelectedItems()).map(item => item.getPath())
    if (this.selection.getActiveListKey() === 'staged') {
      return this.props.unstageFiles(itemPaths)
    } else {
      return this.props.stageFiles(itemPaths)
    }
  }

  selectPrevious (preserveTail = false) {
    this.selection.selectPreviousItem(preserveTail)
    this.selection.coalesce()
    return etch.update(this)
  }

  selectNext (preserveTail = false) {
    this.selection.selectNextItem(preserveTail)
    this.selection.coalesce()
    return etch.update(this)
  }

  selectAll () {
    this.selection.selectAllItems()
    this.selection.coalesce()
    return etch.update(this)
  }

  selectFirst (preserveTail = false) {
    this.selection.selectFirstItem(preserveTail)
    this.selection.coalesce()
    return etch.update(this)
  }

  selectLast (preserveTail = false) {
    this.selection.selectLastItem(preserveTail)
    this.selection.coalesce()
    return etch.update(this)
  }

  writeAfterUpdate () {
    this.reportSelectedItem()
    const headItem = this.selection.getHeadItem()
    if (headItem) this.listElementsByItem.get(headItem).scrollIntoViewIfNeeded()
  }

  reportSelectedItem () {
    if (!this.isFocused()) return

    if (this.selection.getActiveListKey() === 'conflicts') {
      if (this.props.didSelectMergeConflictFile) {
        this.props.didSelectMergeConflictFile(this.selection.getHeadItem())
      }
    } else {
      if (this.props.didSelectFilePatch) {
        this.props.didSelectFilePatch(this.selection.getHeadItem())
      }
    }
  }

  async mousedownOnItem (event, item) {
    if (event.detail >= 2) {
      if (this.selection.listKeyForItem(item) === 'staged') {
        await this.props.unstageFiles([item.getPath()])
      } else {
        await this.props.stageFiles([item.getPath()])
      }
    } else {
      if (event.ctrlKey || event.metaKey) {
        this.selection.addOrSubtractSelection(item)
      } else {
        this.selection.selectItem(item, event.shiftKey)
      }
      this.mouseSelectionInProgress = true
    }
    await etch.update(this)
  }

  mousemoveOnItem (event, item) {
    if (this.mouseSelectionInProgress) {
      this.selection.selectItem(item, true)
      return etch.update(this)
    } else {
      return Promise.resolve()
    }
  }

  mouseup () {
    this.mouseSelectionInProgress = false
    this.selection.coalesce()
  }

  render () {
    const selectedItems = this.selection.getSelectedItems()

    return (
      <div className={`git-StagingView ${this.selection.getActiveListKey()}-changes-focused`} style={{width: 200}} tabIndex='-1' >
        <div className={`git-StagingView-group git-UnstagedChanges ${this.getFocusClass('unstaged')}`}>
          <header className='git-StagingView-header'>
            <span className='icon icon-list-unordered'></span>
            <span className='git-StagingView-title'>Unstaged Changes</span>
          </header>

          <div ref='unstagedChanges' className='git-StagingView-list git-FilePatchListView'>
            {
              this.props.unstagedChanges.map((filePatch) => (
                <FilePatchListItemView
                  registerItemElement={this.registerItemElement}
                  filePatch={filePatch}
                  onmousedown={(event) => this.mousedownOnItem(event, filePatch)}
                  onmousemove={(event) => this.mousemoveOnItem(event, filePatch)}
                  selected={selectedItems.has(filePatch)}
                />
              ))
            }
          </div>
        </div>
        { this.renderMergeConflicts() }
        <div className={`git-StagingView-group git-StagedChanges ${this.getFocusClass('staged')}`} >
          <header className='git-StagingView-header'>
            <span className='icon icon-tasklist'></span>
            <span className='git-StagingView-title'>
              Staged Changes
              {
                this.props.isAmending
                  ? ` (amending ${shortenSha(this.props.lastCommit.sha)})`
                  : ''
              }
            </span>
          </header>
          <div ref='stagedChanges' className='git-StagingView-list git-FilePatchListView'>
            {
              this.props.stagedChanges.map((filePatch) => (
                <FilePatchListItemView
                  filePatch={filePatch}
                  registerItemElement={this.registerItemElement}
                  onmousedown={(event) => this.mousedownOnItem(event, filePatch)}
                  onmousemove={(event) => this.mousemoveOnItem(event, filePatch)}
                  selected={selectedItems.has(filePatch)}
                />
              ))
            }
          </div>
        </div>
      </div>
    )
  }

  renderMergeConflicts (selectedItems) {
    const mergeConflicts = this.props.mergeConflicts

    if (mergeConflicts && mergeConflicts.length > 0) {
      const selectedItems = this.selection.getSelectedItems()
      return (
        <div className={`git-StagingView-group git-MergeConflictPaths ${this.getFocusClass('conflicts')}`}>
          <header className='git-StagingView-header'>
            <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
            <span className='git-StagingView-title'>Merge Conflicts</span>
          </header>
          <div ref='mergeConflicts' className='git-StagingView-list git-FilePatchListView'>
            {
              mergeConflicts.map((mergeConflict) => (
                <MergeConflictListItemView
                  mergeConflict={mergeConflict}
                  registerItemElement={this.registerItemElement}
                  onmousedown={(event) => this.mousedownOnItem(event, mergeConflict)}
                  onmousemove={(event) => this.mousemoveOnItem(event, mergeConflict)}
                  selected={selectedItems.has(mergeConflict)}
                />
              ))
            }
          </div>
        </div>
      )
    } else {
      return <noscript />
    }
  }

  getFocusClass (listKey) {
    return this.selection.getActiveListKey() === listKey ? 'is-focused' : ''
  }

  registerItemElement (item, element) {
    this.listElementsByItem.set(item, element)
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }

  focus () {
    this.element.focus()
    this.reportSelectedItem()
  }

  isFocused () {
    return document.activeElement === this.element
  }
}
