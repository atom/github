/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'

import HunkView from './hunk-view'
import MultiList from '../multi-list'

const EMPTY_SET = new Set()

export default class FilePatchView {
  constructor (props) {
    this.props = props
    this.selectionMode = 'hunk'
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines().filter(l => l.isChanged()) }
    })
    this.multiList = new MultiList(hunkLineLists)
    this.setInitialSelection(this.multiList.getSelectedListKey())
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
    window.addEventListener('mouseup', this.onMouseUp)
    this.disposables = new CompositeDisposable()
    this.disposables.add(new Disposable(() => window.removeEventListener('mouseup', this.onMouseUp)))

    etch.initialize(this)
    this.disposables.add(atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': () => this.focusNextHunk({wrap: true}),
      'git:focus-previous-hunk': () => this.focusPreviousHunk({wrap: true}),
      'core:move-up': () => {
        this.selectionMode === 'hunk' ? this.focusPreviousHunk() : this.focusPreviousHunkLine()
      },
      'core:move-down': () => {
        this.selectionMode === 'hunk' ? this.focusNextHunk() : this.focusNextHunkLine()
      }
    }))
  }

  setInitialSelection (hunk) {
    const nonContextLines = hunk.getLines().filter(l => l.isChanged())
    this.setSelectedHunks([hunk])
    if (this.selectionMode === 'hunk') {
      this.setSelectedLines(nonContextLines)
    } else {
      this.setSelectedLines([nonContextLines[0]])
    }
  }

  setSelectedLines (lines) {
    this.selectedLines = new Set(lines)
  }

  getSelectedLines () {
    return this.selectedLines
  }

  setSelectedHunks (hunks) {
    this.selectedHunks = new Set(hunks)
  }

  getSelectedHunks () {
    return this.selectedHunks
  }

  focusNextHunk ({wrap} = {}) {
    this.multiList.selectNextList({wrap})
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  focusPreviousHunk ({wrap} = {}) {
    this.multiList.selectPreviousList({wrap})
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  focusPreviousHunkLine () {
    this.multiList.selectPreviousItem()
    this.setSelectedLines([this.multiList.getSelectedItem()])
    this.setSelectedHunks([this.multiList.getSelectedListKey()])
    return etch.update(this)
  }

  focusNextHunkLine () {
    this.multiList.selectNextItem()
    this.setSelectedLines([this.multiList.getSelectedItem()])
    this.setSelectedHunks([this.multiList.getSelectedListKey()])
    return etch.update(this)
  }

  update (props) {
    this.props = props
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines().filter(l => l.isChanged()) }
    })
    this.multiList.updateLists(hunkLineLists)
    this.setInitialSelection(this.multiList.getSelectedListKey())
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
        const isSelected = this.getSelectedHunks().has(hunk)
        const selectedLines = isSelected ? this.selectedLines : EMPTY_SET
        return (
          <div onmouseup={this.onMouseUp}
               onmousedown={this.onMouseDown}>
            <HunkView
            hunk={hunk}
            isSelected={isSelected}
            selectedLines={selectedLines}
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

  onMouseDown () {
    return this.enableSelections()
  }

  onMouseUp () {
    return this.disableSelections()
  }

  togglePatchSelectionMode () {
    this.selectionMode = this.selectionMode === 'hunk' ? 'hunkLine' : 'hunk'
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  getPatchSelectionMode () {
    return this.selectionMode
  }

  selectLineForHunk (hunk, selectedLine) {
    if (!this.tail) this.tail = {key: hunk, item: selectedLine}
    this.head = {key: hunk, item: selectedLine}
    this.multiList.selectListForKey(hunk)
    if (this.selectionMode === 'hunk') {
      this.setSelectedLines(hunk.getLines().filter(l => l.isChanged()))
    } else {
      const {items, keys} = this.multiList.getItemsAndKeysInRange(this.tail, this.head)
      this.setSelectedHunks(keys)
      this.setSelectedLines(items)
    }
    return etch.update(this)
  }

  didClickStageButtonForHunk (hunk) {
    // TODO: Test the behavior of this line, which ensure we only attempt to
    // stage the selected lines if we clicked the stage button on the hunk
    // containing them.
    const clickedSelectedHunk = this.getSelectedHunks().has(hunk)
    const selectedLines = this.selectedLines

    if (this.props.stagingStatus === 'unstaged') {
      if (selectedLines.size && clickedSelectedHunk) {
        this.selectedLines = EMPTY_SET
        return this.props.stageLines(selectedLines)
      } else {
        return this.props.stageHunk(hunk)
      }
    } else if (this.props.stagingStatus === 'staged') {
      if (selectedLines.size && clickedSelectedHunk) {
        this.selectedLines = EMPTY_SET
        return this.props.unstageLines(selectedLines)
      } else {
        return this.props.unstageHunk(hunk)
      }
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`)
    }
  }
}
