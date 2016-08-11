/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import HunkView from './hunk-view'

const EMPTY_SET = new Set()

export default class FilePatchView {
  constructor (props) {
    this.props = props
    this.selectionMode = 'hunk'
    this.selectedHunk = props.hunks[0]
    this.selectedHunkIndex = 0
    this.setInitialSelection(this.selectedHunk)
    etch.initialize(this)
    this.subscriptions = atom.commands.add(this.element, {
      'git:toggle-patch-selection-mode': this.togglePatchSelectionMode.bind(this),
      'git:focus-next-hunk': this.focusNextHunk.bind(this)
    })
  }

  setInitialSelection (hunk) {
    if (hunk) {
      if (this.selectionMode === 'hunk') {
        this.selectNonContextLines(hunk.getLines())
      } else {
        this.selectNonContextLines([this.getFirstNonContextLine(hunk)])
      }
    } else {
      this.selectNonContextLines([])
    }
  }

  selectNonContextLines (lines) {
    this.selectedLines = new Set(lines.filter(l => l.isChanged()))
  }

  focusNextHunk () {
    const hunks = this.props.hunks
    let index = hunks.indexOf(this.selectedHunk)
    this.selectedHunk = ++index < hunks.length ? hunks[index] : hunks[0]
    this.selectedHunkIndex = index < hunks.length ? index : 0
    this.setInitialSelection(this.selectedHunk)
    return etch.update(this)
  }

  update (props) {
    this.props = props
    this.selectedHunk = props.hunks[0]
    this.selectedHunkIndex = 0
    this.setInitialSelection(this.selectedHunk)
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
        const isSelected = hunk === this.selectedHunk
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

  getFirstNonContextLine (hunk) {
    const lines = hunk.getLines()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.isChanged()) return line
    }
  }

  togglePatchSelectionMode () {
    this.selectionMode = this.selectionMode === 'hunk' ? 'hunkLine' : 'hunk'
    this.setInitialSelection(this.selectedHunk)
    return etch.update(this)
  }

  getPatchSelectionMode () {
    return this.selectionMode
  }

  selectLinesForHunk (hunk, selectedLines) {
    this.selectedHunk = hunk
    this.selectedHunkIndex = this.props.hunks.indexOf(hunk)
    if (this.selectionMode === 'hunk') {
      this.selectNonContextLines(hunk.getLines())
    } else {
      this.selectNonContextLines([...selectedLines])
    }
    etch.update(this)
  }

  didClickStageButtonForHunk (hunk) {
    // TODO: Test the behavior of this line, which ensure we only attempt to
    // stage the selected lines if we clicked the stage button on the hunk
    // containing them.
    const clickedSelectedHunk = hunk === this.selectedHunk
    const selectedLines = this.selectedLines

    if (this.props.stagingStatus === 'unstaged') {
      if (this.selectedLines && clickedSelectedHunk) {
        this.selectedLines = EMPTY_SET
        return this.props.stageLines(selectedLines)
      } else {
        return this.props.stageHunk(hunk)
      }
    } else if (this.props.stagingStatus === 'staged') {
      if (this.selectedLines && clickedSelectedHunk) {
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
