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
    this.mousedownOnItem = this.mousedownOnItem.bind(this)
    this.mousemoveOnItem = this.mousemoveOnItem.bind(this)
    this.mouseup = this.mouseup.bind(this)
    this.mouseSelectionInProgress = false
    this.selection = new CompositeListSelection({
      listsByKey: {
        unstaged: this.props.unstagedChanges,
        conflicts: this.props.mergeConflicts || [],
        staged: this.props.stagedChanges
      },
      idForItem: item => item.getPath()
    })
    etch.initialize(this)

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(this.element, {
      'core:move-up': () => this.selectPrevious(),
      'core:move-down': () => this.selectNext(),
      'core:select-up': () => this.selectPrevious(true),
      'core:select-down': () => this.selectNext(true),
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
    return etch.update(this)
  }

  selectNext (preserveTail = false) {
    this.selection.selectNextItem(preserveTail)
    return etch.update(this)
  }

  focusFilePatchView () {
  }

  mousedownOnItem (event, item) {
    if (event.detail >= 2) {
      if (this.selection.listKeyForItem(item) === 'staged') {
        this.props.unstageFiles([item.getPath()])
      } else {
        this.props.stageFiles([item.getPath()])
      }
    } else {
      if (event.ctrlKey || event.metaKey) {
        this.selection.addOrSubtractSelection(item)
      } else {
        this.selection.selectItem(item, event.shiftKey)
      }
      this.mouseSelectionInProgress = true
    }
    return etch.update(this)
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
  }

  render () {
    const selectedItems = this.selection.getSelectedItems()

    let stagedClassName = ''
    let unstagedClassName = ''
    let conflictsClassName = ''
    const selectedList = this.selection.getActiveListKey()
    if (selectedList === 'staged') {
      stagedClassName = 'is-focused'
    } else if (selectedList === 'unstaged') {
      unstagedClassName = 'is-focused'
    } else if (selectedList === 'conflicts') {
      conflictsClassName = 'is-focused'
    }

    const mergeConflictsView = (
      <div className={`git-StagingView-group git-MergeConflictPaths ${conflictsClassName}`}>
        <header className='git-StagingView-header'>
          <span className={'git-FilePatchListView-icon icon icon-alert status-modified'} />
          <span className='git-StagingView-title'>Merge Conflicts</span>
        </header>
        <div ref='mergeConflictListView' className='git-StagingView-list git-FilePatchListView'>
          {
            this.props.mergeConflicts.map((mergeConflict) => (
              <MergeConflictListItemView
                mergeConflict={mergeConflict}
                onmousedown={(event) => this.mousedownOnItem(event, mergeConflict)}
                onmousemove={(event) => this.mousemoveOnItem(event, mergeConflict)}
                selected={selectedItems.has(mergeConflict)}
              />
            ))
          }
        </div>
      </div>
    )

    return (
      <div className={`git-StagingView ${this.selection.getActiveListKey()}-changes-focused`} style={{width: 200}} tabIndex='-1' >
        <div className={`git-StagingView-group git-UnstagedChanges ${unstagedClassName}`}>
          <header className='git-StagingView-header'>
            <span className='icon icon-diff'></span>
            <span className='git-StagingView-title'>Unstaged Changes</span>
          </header>

          <div ref='unstagedChangesView' className='git-StagingView-list git-FilePatchListView'>
            {
              this.props.unstagedChanges.map((filePatch) => (
                <FilePatchListItemView
                  filePatch={filePatch}
                  onmousedown={(event) => this.mousedownOnItem(event, filePatch)}
                  onmousemove={(event) => this.mousemoveOnItem(event, filePatch)}
                  selected={selectedItems.has(filePatch)}
                />
              ))
            }
          </div>
        </div>
        { this.mergeConflicts ? mergeConflictsView : <noscript /> }
        <div className={`git-StagingView-group git-StagedChanges ${stagedClassName}`} >
          <header className='git-StagingView-header'>
            <span className='icon icon-checklist'></span>
            <span className='git-StagingView-title'>
              Staged Changes
              {
                this.props.isAmending
                  ? ` (amending ${shortenSha(this.props.lastCommit.sha)})`
                  : ''
              }
            </span>
          </header>
          <div ref='stagedChangesView' className='git-StagingView-list git-FilePatchListView'>
            {
              this.props.stagedChanges.map((filePatch) => (
                <FilePatchListItemView
                  filePatch={filePatch}
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
