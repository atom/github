/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class HunkComponent {
  constructor ({hunk, isSelected, selectedLines, didSelectLines, didClickStagingButton, stagingButtonLabel}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    this.didSelectLines = didSelectLines
    this.didClickStagingButton = didClickStagingButton
    this.stagingButtonLabel = stagingButtonLabel
    etch.initialize(this)
  }

  onMouseDown (hunkLine) {
    this.startingLineIndex = this.hunk.getLines().indexOf(hunkLine)
    this.didSelectLines(new Set([hunkLine]))
  }

  onMouseMove (hunkLine) {
    if (this.startingLineIndex === -1) return

    const selectedLines = new Set()
    const index = this.hunk.getLines().indexOf(hunkLine)
    const start = Math.min(index, this.startingLineIndex)
    const end = Math.max(index, this.startingLineIndex)
    for (let i = start; i <= end; i++) {
      selectedLines.add(this.hunk.getLines()[i])
    }

    this.didSelectLines(selectedLines)
  }

  onMouseUp (hunkLine) {
    this.startingLineIndex = -1
  }

  update ({hunk, isSelected, selectedLines}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    return etch.update(this)
  }

  render () {
    const hunkSelectedClass = this.isSelected ? 'is-selected' : ''
    let stagingButtonLabel = this.stagingButtonLabel + ' '
    if (this.selectedLines.size === 0) {
      stagingButtonLabel += 'Hunk'
    } else if (this.selectedLines.size === 1) {
      stagingButtonLabel += 'Line'
    } else {
      stagingButtonLabel += 'Lines'
    }

    return (
      <div className={`git-HunkComponent ${hunkSelectedClass}`}>
        <div className='git-HunkComponent-header'>
          <span ref='header'>{this.hunk.getHeader()}</span>
          <button ref='stagingButton' className='git-HunkComponent-stagingButton' onclick={this.didClickStagingButton}>
            {stagingButtonLabel}
          </button>
        </div>
        {this.hunk.getLines().map((line) => {
          const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
          const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
          const lineSelectedClass = this.selectedLines.has(line) ? 'is-selected' : ''
          return (
            <div className={`git-HunkComponent-line ${lineSelectedClass}`}
                 onmousedown={() => this.onMouseDown(line)}
                 onmousemove={() => this.onMouseMove(line)}
                 onmouseup={() => this.onMouseUp(line)}>
              <div className='git-HunkComponent-oldLineNumber'>{oldLineNumber}</div>
              <div className='git-HunkComponent-newLineNumber'>{newLineNumber}</div>
              <div className='git-HunkComponent-lineContent'>
                <span>{line.getOrigin()}</span>
                <span>{line.getText()}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}
