/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'

import HunkView from './hunk-view'
import FilePatchSelection from './file-patch-selection'

const EMPTY_SET = new Set()

export default class FilePatchView {
  constructor (props) {
    this.props = props
    this.selection = new FilePatchSelection(this.props.hunks)

    this.mouseSelectionInProgress = false
    this.mousedownOnLine = this.mousedownOnLine.bind(this)
    this.mousemoveOnLine = this.mousemoveOnLine.bind(this)
    this.mouseup = this.mouseup.bind(this)
    window.addEventListener('mouseup', this.mouseup)
    this.disposables = new CompositeDisposable()
    this.disposables.add(new Disposable(() => window.removeEventListener('mouseup', this.mouseup)))

    etch.initialize(this)
    this.disposables.add(atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': () => this.selectNextHunk(),
      'git:focus-previous-hunk': () => this.selectPreviousHunk(),
      'core:confirm': () => this.stageSelectedLines(),
      'core:move-up': () => this.selectPrevious(),
      'core:move-down': () => this.selectNext(),
      'core:move-to-top': () => this.selectFirst(),
      'core:move-to-bottom': () => this.selectLast(),
      'core:select-up': () => this.selectToPrevious(),
      'core:select-down': () => this.selectToNext(),
      'core:select-to-top': () => this.selectToFirst(),
      'core:select-to-bottom': () => this.selectToLast(),
      'core:select-all': () => this.selectAll()
    }))
  }

  update (props) {
    this.props = props
    this.selection.updateHunks(this.props.hunks)
    return etch.update(this)
  }

  destroy () {
    this.disposables.dispose()
    return etch.destroy(this)
  }

  render () {
    const selectedHunks = this.selection.getSelectedHunks()
    const selectedLines = this.selection.getSelectedLines()
    const stageButtonLabelPrefix = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage'
    return (
      <div className='git-FilePatchView' tabIndex='-1'
        onmouseup={this.mouseup}>
        {this.props.hunks.map((hunk) => {
          const isSelected = selectedHunks.has(hunk)
          const stageButtonLabel =
            stageButtonLabelPrefix +
              ((this.selection.getMode() === 'hunk' || !isSelected) ? ' Hunk' : ' Selection')

          return (
            <HunkView
              hunk={hunk}
              isSelected={selectedHunks.has(hunk)}
              stageButtonLabel={stageButtonLabel}
              selectedLines={selectedLines}
              mousedownOnHeader={() => this.mousedownOnHeader(hunk)}
              mousedownOnLine={this.mousedownOnLine}
              mousemoveOnLine={this.mousemoveOnLine}
              didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
              registerView={this.props.registerHunkView} />
          )
        })}
      </div>
    )
  }

  mousedownOnHeader (hunk) {
    this.selection.selectHunk(hunk)
    this.mouseSelectionInProgress = true
    return etch.update(this)
  }

  mousedownOnLine (event, hunk, line) {
    if (event.ctrlKey || event.metaKey) {
      this.selection.addOrSubtractLineSelection(line)
    } else if (event.shiftKey) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.selectHunk(hunk, true)
      } else {
        this.selection.selectLine(line, true)
      }
    } else {
      if (event.detail === 1) {
        this.selection.selectLine(line, false)
      } else {
        this.selection.selectHunk(hunk, false)
      }
    }
    this.mouseSelectionInProgress = true
    return etch.update(this)
  }

  mousemoveOnLine (event, hunk, line) {
    if (this.mouseSelectionInProgress) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.selectHunk(hunk, true)
      } else {
        this.selection.selectLine(line, true)
      }
      return etch.update(this)
    }
  }

  mouseup (event, hunk, line) {
    this.mouseSelectionInProgress = false
    this.selection.coalesce()
  }

  togglePatchSelectionMode () {
    this.selection.toggleMode()
    return etch.update(this)
  }

  selectNext () {
    this.selection.selectNext()
    return etch.update(this)
  }

  selectToNext () {
    this.selection.selectNext(true)
    this.selection.coalesce()
    return etch.update(this)
  }

  selectPrevious () {
    this.selection.selectPrevious()
    return etch.update(this)
  }

  selectToPrevious () {
    this.selection.selectPrevious(true)
    this.selection.coalesce()
    return etch.update(this)
  }

  selectFirst () {
    this.selection.selectFirst()
    return etch.update(this)
  }

  selectToFirst () {
    this.selection.selectFirst(true)
    return etch.update(this)
  }

  selectLast () {
    this.selection.selectLast()
    return etch.update(this)
  }

  selectToLast () {
    this.selection.selectLast(true)
    return etch.update(this)
  }

  selectAll () {
    this.selection.selectAll()
    return etch.update(this)
  }

  didClickStageButtonForHunk (hunk) {
    if (this.selection.getMode() === 'line' && this.selection.getSelectedHunks().has(hunk)) {
      return this.stageSelectedLines()
    } else {
      return this.stageHunk(hunk)
    }
  }

  stageSelectedLines () {
    const selectedLines = this.selection.getSelectedLines()
    if (this.props.stagingStatus === 'unstaged') {
      return this.props.stageLines(selectedLines)
    } else if (this.props.stagingStatus === 'staged') {
      return this.props.unstageLines(selectedLines)
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`)
    }
  }

  stageHunk (hunk) {
    if (this.props.stagingStatus === 'unstaged') {
      return this.props.stageHunk(hunk)
    } else if (this.props.stagingStatus === 'staged') {
      return this.props.unstageHunk(hunk)
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`)
    }
  }
}
