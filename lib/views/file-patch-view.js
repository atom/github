/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import HunkView from './hunk-view'
import MultiList from '../multi-list'

const EMPTY_SET = new Set()

function getFirstNonContextLine (hunk) {
  const lines = hunk.getLines()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.isChanged()) return line
  }
}

export default class FilePatchView {
  constructor (props) {
    this.props = props
    this.selectionMode = 'hunk'
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines() }
    })
    this.multiList = new MultiList(hunkLineLists)
    this.setInitialSelection(this.multiList.getSelectedListKey())
    etch.initialize(this)
    this.subscriptions = atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': this.focusNextHunk.bind(this),
      'git:focus-previous-hunk': this.focusPreviousHunk.bind(this)
    })
  }

  setInitialSelection (hunk) {
    if (this.selectionMode === 'hunk') {
      this.selectNonContextLines(hunk.getLines())
    } else {
      this.selectNonContextLines([getFirstNonContextLine(hunk)])
    }
  }

  selectNonContextLines (lines) {
    this.selectedLines = new Set(lines.filter(l => l.isChanged()))
  }

  focusNextHunk () {
    this.multiList.selectNextList({wrap: true})
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  focusPreviousHunk () {
    this.multiList.selectPreviousList({wrap: true})
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  update (props) {
    this.props = props
    const hunkLineLists = props.hunks.map(hunk => {
      return { key: hunk, items: hunk.getLines() }
    })
    this.multiList.updateLists(hunkLineLists)
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  destroy () {
    this.subscriptions.dispose()
    return etch.destroy(this)
  }

  render () {
    let stageButtonLabelPrefix = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage'
    return (
      <div className='git-FilePatchView' tabIndex='-1'>{this.props.hunks.map((hunk) => {
        const isSelected = hunk === this.multiList.getSelectedListKey()
        const selectedLines = isSelected ? this.selectedLines : EMPTY_SET
        return (
          <HunkView
            hunk={hunk}
            isSelected={isSelected}
            selectedLines={selectedLines}
            selectLines={(lines) => this.selectLinesForHunk(hunk, lines)}
            didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
            stageButtonLabelPrefix={stageButtonLabelPrefix}
            registerView={this.props.registerHunkView} />
        )
      })}
      </div>
    )
  }

  togglePatchSelectionMode () {
    this.selectionMode = this.selectionMode === 'hunk' ? 'hunkLine' : 'hunk'
    this.setInitialSelection(this.multiList.getSelectedListKey())
    return etch.update(this)
  }

  getPatchSelectionMode () {
    return this.selectionMode
  }

  selectLinesForHunk (hunk, selectedLines) {
    this.multiList.selectListForKey(hunk)
    if (this.selectionMode === 'hunk') {
      this.selectNonContextLines(hunk.getLines())
    } else {
      this.selectNonContextLines([...selectedLines])
    }
    return etch.update(this)
  }

  didClickStageButtonForHunk (hunk) {
    // TODO: Test the behavior of this line, which ensure we only attempt to
    // stage the selected lines if we clicked the stage button on the hunk
    // containing them.
    const clickedSelectedHunk = hunk === this.multiList.getSelectedListKey()
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
