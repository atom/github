/** @babel */

import Hunk from './hunk'
import HunkLine from './hunk-line'

export default class FileDiff {
  constructor (oldPath, newPath, oldMode, newMode, status, hunks) {
    this.oldPath = oldPath
    this.newPath = newPath
    this.oldMode = oldMode
    this.newMode = newMode
    this.status = status
    this.hunks = hunks
  }

  getOldPath () {
    return this.oldPath
  }

  getNewPath () {
    return this.newPath
  }

  getOldMode () {
    return this.oldMode
  }

  getNewMode () {
    return this.newMode
  }

  getStatus () {
    return this.status
  }

  getHunks () {
    return this.hunks
  }

  invert () {
    let invertedStatus
    switch (this.getStatus()) {
      case 'modified':
        invertedStatus = 'modified'
        break
      case 'added':
        invertedStatus = 'removed'
        break
      case 'removed':
        invertedStatus = 'added'
        break
      case 'renamed':
        invertedStatus = 'renamed'
        break
      default:
        throw new Error(`Unknown Status: ${this.getStatus()}`)
    }
    const invertedHunks = this.getHunks().map(h => h.invert())
    return new FileDiff(
      this.getNewPath(),
      this.getOldPath(),
      this.getNewMode(),
      this.getOldMode(),
      invertedStatus,
      invertedHunks
    )
  }

  buildDiffWithLines (selectedLines) {
    let delta = 0
    const hunks = []
    for (let hunk of this.getHunks()) {
      const newStartRow = hunk.getNewStartRow() + delta
      let newLineNumber = newStartRow
      const lines = []
      for (let line of hunk.getLines()) {
        if (selectedLines.has(line)) {
          if (line.getStatus() === 'removed') {
            lines.push(line.copy())
          } else {
            lines.push(line.copy({newLineNumber: newLineNumber++}))
          }
        } else if (line.getStatus() === 'removed') {
          lines.push(line.copy({newLineNumber: newLineNumber++, status: 'unchanged'}))
        } else if (line.getStatus() === 'unchanged') {
          lines.push(line.copy({newLineNumber: newLineNumber++}))
        }
      }
      const newRowCount = newLineNumber - newStartRow
      hunks.push(new Hunk(hunk.getOldStartRow(), newStartRow, hunk.getOldRowCount(), newRowCount, lines))
      delta += newRowCount - hunk.getNewRowCount()
    }

    return new FileDiff(
      this.getOldPath(),
      this.getNewPath(),
      this.getOldMode(),
      this.getNewMode(),
      this.getStatus(),
      hunks
    )
  }

  toString () {
    return this.getHunks().map(h => h.toString()).join('')
  }
}
