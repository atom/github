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
    this.multiListCollection = new MultiListCollection(hunkLineLists)
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

  update (props) {
    this.props = props
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines().filter(l => l.isChanged()) }
    })
    this.multiListCollection.updateLists(hunkLineLists)
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
      <div className='git-FilePatchView' tabIndex='-1'
           onmouseup={() => this.disableSelections()}
           onmousedown={() => this.enableSelections()}>
        {this.props.hunks.map((hunk) => {
          const isSelected = this.multiListCollection.getSelectedKeys().has(hunk)
          const selectedLines = isSelected ? this.multiListCollection.getSelectedItems() : EMPTY_SET
          return (
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

  togglePatchSelectionMode () {
    this.selectionMode = this.selectionMode === 'hunk' ? 'hunkLine' : 'hunk'
    this.selectLinesBasedOnSelectionMode()
    return etch.update(this)
  }

  setInitialSelection () {
    if (this.selectionMode === 'hunk') {
      this.multiListCollection.selectAllItemsForKey(this.multiListCollection.getLastSelectedListKey())
    }
  }

  getPatchSelectionMode () {
    return this.selectionMode
  }

  getSelectedLines () {
    return this.multiListCollection.getSelectedItems()
  }

  getSelectedHunks () {
    return this.multiListCollection.getSelectedKeys()
  }

  focusHunk (hunk) {
    this.multiListCollection.selectKeys([hunk])
    this.setInitialSelection()
  }

  focusNextHunk ({wrap, addToExisting} = {}) {
    this.multiListCollection.selectNextList({wrap, addToExisting})
    this.selectLinesBasedOnSelectionMode({addToExisting})
    return etch.update(this)
  }

  focusPreviousHunk ({wrap, addToExisting} = {}) {
    this.multiListCollection.selectPreviousList({wrap, addToExisting})
    this.selectLinesBasedOnSelectionMode({addToExisting})
    return etch.update(this)
  }

  focusPreviousHunkLine ({addToExisting} = {}) {
    this.multiListCollection.selectPreviousItem({addToExisting})
    return etch.update(this)
  }

  focusNextHunkLine ({addToExisting} = {}) {
    this.multiListCollection.selectNextItem({addToExisting})
    return etch.update(this)
  }

  selectLineForHunk (hunk, selectedLine) {
    if (!this.tail) this.tail = {key: hunk, item: selectedLine}
    this.head = {key: hunk, item: selectedLine}
    if (this.selectionMode === 'hunk') {
      this.multiListCollection.selectAllItemsForKey(hunk, true)
    } else {
      this.multiListCollection.selectItemsAndKeysInRange(this.tail, this.head)
    }
    return etch.update(this)
  }

  selectLinesBasedOnSelectionMode ({addToExisting} = {}) {
    const hunk = this.multiListCollection.getLastSelectedListKey()
    if (this.selectionMode === 'hunk') {
      this.multiListCollection.selectAllItemsForKey(hunk, addToExisting)
    } else {
      this.multiListCollection.selectFirstItemForKey(hunk)
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

  stageSelectedLines () {
    this.disableSelections()
    const selectedLines = this.getSelectedLines()
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
}
