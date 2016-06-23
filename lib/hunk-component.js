/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

export default class HunkComponent {
  constructor ({hunk, onDidChangeSelectedLines}) {
    this.hunk = hunk
    this.selectedLines = new Set
    this.onDidChangeSelectedLines = onDidChangeSelectedLines
    this.subscriptions = new CompositeDisposable
    etch.initialize(this)
  }

  didChangeSelectedLines () {
    this.onDidChangeSelectedLines(Array.from(this.selectedLines))
  }

  clearSelection () {
    this.startingLineIndex = -1
    this.selectedLines.clear()
    this.didChangeSelectedLines()
    return etch.update(this)
  }

  onMouseDown (hunkLine) {
    this.startingLineIndex = this.hunk.getLines().indexOf(hunkLine)
    this.selectedLines.clear()
    this.selectedLines.add(hunkLine)
    this.didChangeSelectedLines()
    return etch.update(this)
  }

  onMouseMove (hunkLine) {
    if (this.startingLineIndex === -1) return

    this.selectedLines.clear()
    const index = this.hunk.getLines().indexOf(hunkLine)
    const start = Math.min(index, this.startingLineIndex)
    const end = Math.max(index, this.startingLineIndex)
    for (let i = start; i <= end; i++) {
      this.selectedLines.add(this.hunk.getLines()[i])
    }

    this.didChangeSelectedLines()
    return etch.update(this)
  }

  onMouseUp (hunkLine) {
    this.startingLineIndex = -1
  }

  update ({hunk}) {
    this.hunk = hunk
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-HunkComponent'>
        <div className='git-HunkComponent-header'>{this.hunk.getHeader()}</div>
        {this.hunk.getLines().map((line) => {
          const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
          const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
          const selectedClass = this.selectedLines.has(line) ? 'is-selected' : ''
          return (
            <div className={`git-HunkComponent-line ${selectedClass}`}
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
