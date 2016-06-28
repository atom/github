/** @babel */
/** @jsx etch.dom */

import {Disposable} from 'atom'
import etch from 'etch'

export default class HunkComponent {
  constructor ({hunk, isSelected, selectedLines, didSelectLines, didClickStageButton, stageButtonLabelPrefix, registerComponent}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    this.startingLineIndex = -1
    this.didSelectLines = didSelectLines
    this.didClickStageButton = didClickStageButton
    this.stageButtonLabelPrefix = stageButtonLabelPrefix
    const mouseUpHandler = this.onMouseUp.bind(this)
    window.addEventListener('mouseup', mouseUpHandler)
    this.disposables = new Disposable(() => window.removeEventListener('mouseup', mouseUpHandler))
    if (registerComponent != null) registerComponent(hunk, this) // only for tests
    etch.initialize(this)
  }

  destroy () {
    this.disposables.dispose()
    return etch.destroy(this)
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

  update ({hunk, isSelected, selectedLines, didSelectLines, didClickStageButton, stageButtonLabelPrefix, registerComponent}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    this.didSelectLines = didSelectLines
    this.didClickStageButton = didClickStageButton
    this.stageButtonLabelPrefix = stageButtonLabelPrefix || this.stageButtonLabelPrefix
    if (registerComponent != null) registerComponent(hunk, this) // only for tests
    return etch.update(this)
  }

  render () {
    const hunkSelectedClass = this.isSelected ? 'is-selected' : ''
    let stageButtonLabel = this.stageButtonLabelPrefix
    if (this.selectedLines.size === 0) {
      stageButtonLabel += ' Hunk'
    } else if (this.selectedLines.size === 1) {
      stageButtonLabel += ' Line'
    } else {
      stageButtonLabel += ' Lines'
    }

    return (
      <div className={`git-HunkComponent ${hunkSelectedClass}`}>
        <div className='git-HunkComponent-header'>
          <span ref='header'>{this.hunk.getHeader()}</span>
          <button ref='stageButton' className='git-HunkComponent-stageButton' onclick={this.didClickStageButton}>
            {stageButtonLabel}
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
