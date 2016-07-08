/** @babel */
/** @jsx etch.dom */

import {Disposable} from 'atom'
import etch from 'etch'

export default class HunkView {
  constructor ({hunk, isSelected, selectedLines, selectLines, didClickStageButton, stageButtonLabelPrefix, registerView}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    this.startingLineIndex = -1
    this.selectLines = selectLines
    this.didClickStageButton = didClickStageButton
    this.stageButtonLabelPrefix = stageButtonLabelPrefix
    const mouseUpHandler = this.onMouseUp.bind(this)
    window.addEventListener('mouseup', mouseUpHandler)
    this.disposables = new Disposable(() => window.removeEventListener('mouseup', mouseUpHandler))
    if (registerView != null) registerView(hunk, this) // only for tests
    etch.initialize(this)
  }

  destroy () {
    this.disposables.dispose()
    return etch.destroy(this)
  }

  onMouseDown (hunkLine) {
    this.startingLineIndex = this.hunk.getLines().indexOf(hunkLine)
    this.selectLines(new Set([hunkLine]))
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

    this.selectLines(selectedLines)
  }

  onMouseUp (hunkLine) {
    this.startingLineIndex = -1
  }

  update ({hunk, isSelected, selectedLines, selectLines, didClickStageButton, stageButtonLabelPrefix, registerView}) {
    this.hunk = hunk
    this.isSelected = isSelected
    this.selectedLines = selectedLines
    this.selectLines = selectLines
    this.didClickStageButton = didClickStageButton
    this.stageButtonLabelPrefix = stageButtonLabelPrefix || this.stageButtonLabelPrefix
    if (registerView != null) registerView(hunk, this) // only for tests
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
      <div className={`git-HunkView ${hunkSelectedClass}`}>
        <div className='git-HunkView-header'>
          <span ref='header' className='git-HunkView-title'>{this.hunk.getHeader()}</span>
          <button ref='stageButton' className='git-HunkView-stageButton' onclick={this.didClickStageButton}>
            {stageButtonLabel}
          </button>
        </div>
        {this.hunk.getLines().map((line) => {
          const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
          const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
          const lineSelectedClass = this.selectedLines.has(line) ? 'is-selected' : ''
          return (
            <div className={`git-HunkView-line ${lineSelectedClass} is-${line.getStatus()}`}
                 onmousedown={() => this.onMouseDown(line)}
                 onmousemove={() => this.onMouseMove(line)}
                 onmouseup={() => this.onMouseUp(line)}>
              <div className='git-HunkView-lineNumber is-old'>{oldLineNumber}</div>
              <div className='git-HunkView-lineNumber is-new'>{newLineNumber}</div>
              <div className='git-HunkView-lineContent'>
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
