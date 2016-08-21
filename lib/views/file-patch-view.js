/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'

import HunkView from './hunk-view'
import MultiListCollection from '../multi-list-collection'

const EMPTY_SET = new Set()

export default class FilePatchView {
  constructor (props) {
    this.props = props
    this.selectionMode = 'hunk'
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines().filter(l => l.isChanged()) }
    })
    this.list = new MultiListCollection(hunkLineLists)
    this.setInitialSelection()
    this.enableSelections = this.enableSelections.bind(this)
    this.disableSelections = this.disableSelections.bind(this)
    window.addEventListener('mouseup', this.disableSelections)
    this.disposables = new CompositeDisposable()
    this.disposables.add(new Disposable(() => window.removeEventListener('mouseup', this.disableSelections)))

    etch.initialize(this)
    this.disposables.add(atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': () => this.focusNextHunk({wrap: true}),
      'git:focus-previous-hunk': () => this.focusPreviousHunk({wrap: true}),
      'core:confirm': () => this.stageSelectedLines(),
      'core:move-up': () => {
        this.selectionMode === 'hunk' ? this.focusPreviousHunk() : this.focusPreviousHunkLine()
      },
      'core:move-down': () => {
        this.selectionMode === 'hunk' ? this.focusNextHunk() : this.focusNextHunkLine()
      },
      'core:select-up': () => {
        this.selectionMode === 'hunk' ? this.focusPreviousHunk({addToExisting: true}) : this.focusPreviousHunkLine({addToExisting: true})
      },
      'core:select-down': () => {
        this.selectionMode === 'hunk' ? this.focusNextHunk({addToExisting: true}) : this.focusNextHunkLine({addToExisting: true})
      }
    }))
  }

  setInitialSelection () {
    if (this.selectionMode === 'hunk') {
      this.list.selectAllItemsForKey(this.list.getLastSelectedListKey())
    }
  }

  getSelectedLines () {
    return this.list.getSelectedItems()
  }

  getSelectedHunks () {
    return this.list.getSelectedKeys()
  }

  focusNextHunk ({wrap, addToExisting} = {}) {
    this.list.selectNextList({wrap, addToExisting})
    this.selectLinesBasedOnSelectionMode({addToExisting})
    return etch.update(this)
  }

  focusPreviousHunk ({wrap, addToExisting} = {}) {
    this.list.selectPreviousList({wrap, addToExisting})
    this.selectLinesBasedOnSelectionMode({addToExisting})
    return etch.update(this)
  }

  focusPreviousHunkLine ({addToExisting} = {}) {
    this.list.selectPreviousItem({addToExisting})
    return etch.update(this)
  }

  focusNextHunkLine ({addToExisting} = {}) {
    this.list.selectNextItem({addToExisting})
    return etch.update(this)
  }

  update (props) {
    this.props = props
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines().filter(l => l.isChanged()) }
    })
    this.list.updateLists(hunkLineLists)
    this.setInitialSelection()
    return etch.update(this)
  }

  destroy () {
    this.disposables.dispose()
    return etch.destroy(this)
  }

  render () {
    let stageButtonLabelPrefix = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage'
    return (
      <div className='git-FilePatchView' tabIndex='-1'>{this.props.hunks.map((hunk) => {
        const isSelected = this.list.getSelectedKeys().has(hunk)
        const selectedLines = isSelected ? this.list.getSelectedItems() : EMPTY_SET
        return (
          <div onmouseup={() => this.disableSelections()}
               onmousedown={() => this.enableSelections()}>
            <HunkView
              hunk={hunk}
              isSelected={isSelected}
              selectedLines={selectedLines}
              focusHunk={() => this.focusHunk(hunk)}
              selectLine={(line) => this.selectLineForHunk(hunk, line)}
              didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
              stageButtonLabelPrefix={stageButtonLabelPrefix}
              selectionEnabled={this.selectionEnabled}
              registerView={this.props.registerHunkView} />
          </div>
        )
      })}
      </div>
    )
  }

  enableSelections () {
    this.selectionEnabled = true
    return etch.update(this)
  }

  disableSelections () {
    this.tail = null
    this.selectionEnabled = false
    return etch.update(this)
  }

  selectLinesBasedOnSelectionMode ({addToExisting} = {}) {
    const hunk = this.list.getLastSelectedListKey()
    if (this.selectionMode === 'hunk') {
      this.list.selectAllItemsForKey(hunk, addToExisting)
    } else {
      this.list.selectFirstItemForKey(hunk)
    }
  }

  togglePatchSelectionMode () {
    this.selectionMode = this.selectionMode === 'hunk' ? 'hunkLine' : 'hunk'
    this.selectLinesBasedOnSelectionMode()
    return etch.update(this)
  }

  getPatchSelectionMode () {
    return this.selectionMode
  }

  focusHunk (hunk) {
    this.list.selectKeys([hunk])
    this.setInitialSelection()
  }

  selectLineForHunk (hunk, selectedLine) {
    if (!this.tail) this.tail = {key: hunk, item: selectedLine}
    this.head = {key: hunk, item: selectedLine}
    if (this.selectionMode === 'hunk') {
      this.list.selectAllItemsForKey(hunk, true)
    } else {
      this.list.selectItemsAndKeysInRange(this.tail, this.head)
    }
    return etch.update(this)
  }

  stageSelectedLines () {
    this.disableSelections()
    const selectedLines = this.getSelectedLines()
    this.list.clearSelectedItems()
    if (this.props.stagingStatus === 'unstaged') {
      return this.props.stageLines(selectedLines)
    } else if (this.props.stagingStatus === 'staged') {
      return this.props.unstageLines(selectedLines)
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`)
    }
  }

  stageHunk (hunk) {
    this.disableSelections()
    if (this.props.stagingStatus === 'unstaged') {
      return this.props.stageHunk(hunk)
    } else if (this.props.stagingStatus === 'staged') {
      return this.props.unstageHunk(hunk)
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`)
    }
  }

  didClickStageButtonForHunk (hunk) {
    // TODO: Test the behavior of this line, which ensure we only attempt to
    // stage the selected lines if we clicked the stage button on the hunk
    // containing them.
    this.disableSelections()
    const clickedSelectedHunk = this.getSelectedHunks().has(hunk)
    if (clickedSelectedHunk) {
      return this.stageSelectedLines()
    } else {
      return this.stageHunk(hunk)
    }
  }
}
