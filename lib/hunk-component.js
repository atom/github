/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

export default class HunkComponent {
  constructor ({hunk, onDidChangeSelection}) {
    this.hunk = hunk
    this.selectedLines = new Set
    this.onDidChangeSelection = onDidChangeSelection
    this.subscriptions = new CompositeDisposable
    etch.initialize(this)
  }

  clearSelection () {
    this.startingLineIndex = -1
    this.selectedLines.clear()
    return etch.update(this)
  }

  onMouseDown (hunkLine) {
    this.startingLineIndex = this.hunk.getLines().indexOf(hunkLine)
    this.selectedLines.clear()
    this.selectedLines.add(hunkLine)
    this.onDidChangeSelection()
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

    this.onDidChangeSelection()
    return etch.update(this)
  }

  onMouseUp (hunkLine) {
    this.startingLineIndex = -1
  }

  getSelectedLines () {
    return Array.from(this.selectedLines)
  }

  update ({hunk}) {
    this.hunk = hunk
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-HunkStaging'>
        <div className='header'>{this.hunk.getHeader()}</div>
        {this.hunk.getLines().map((line) => {
          const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
          const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
          const selectedClass = this.selectedLines.has(line) ? 'is-selected' : ''
          return (
            <div className={`git-HunkLine ${selectedClass} status-${line.getStatus()}`}
                 onmousedown={() => this.onMouseDown(line)}
                 onmousemove={() => this.onMouseMove(line)}
                 onmouseup={() => this.onMouseUp(line)}>
              <div className='old-line-number'>{oldLineNumber}</div>
              <div className='new-line-number'>{newLineNumber}</div>
              <div className='origin'>{line.getOrigin()}</div>
              <div className='content'>{line.getText()}</div>
            </div>
          )
        })}
      </div>
    )
  }
}
