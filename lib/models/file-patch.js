/** @babel */

import Hunk from './hunk'
import {Emitter} from 'atom'

export default class FilePatch {
  constructor (oldPath, newPath, oldMode, newMode, status, hunks) {
    this.oldPath = oldPath
    this.newPath = newPath
    this.oldMode = oldMode
    this.newMode = newMode
    this.status = status
    this.hunks = hunks
    Object.defineProperty(this, 'destroyed', {value: false, enumerable: false, writable: true})
    Object.defineProperty(this, 'emitter', {value: new Emitter(), enumerable: false})
  }

  copy () {
    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
      this.getOldMode(),
      this.getNewMode(),
      this.getStatus(),
      this.getHunks().map(h => h.copy())
    )
  }

  destroy () {
    this.destroyed = true
    this.emitter.emit('did-destroy')
    this.emitter.dispose()
  }

  update (oldMode, newMode, hunks) {
    this.oldMode = oldMode
    this.newMode = newMode
    this.hunks = hunks
    this.emitter.emit('did-update')
  }

  onDidDestroy (callback) {
    return this.emitter.on('did-destroy', callback)
  }

  onDidUpdate (callback) {
    return this.emitter.on('did-update', callback)
  }

  isDestroyed () {
    return this.destroyed
  }

  getId () {
    return this.getDescriptionPath()
  }

  getOldPath () {
    return this.oldPath
  }

  getNewPath () {
    return this.newPath
  }

  getDescriptionPath () {
    if (this.status === 'renamed') {
      return `${this.getOldPath()} → ${this.getNewPath()}`
    } else if (this.status === 'added') {
      return this.getNewPath()
    } else if (this.status === 'removed' || this.status === 'modified') {
      return this.getOldPath()
    }
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

  getStagePatchForLines (selectedLines) {
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

    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
      this.getOldMode(),
      this.getNewMode(),
      this.getStatus(),
      hunks
    )
  }

  getUnstagePatch () {
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
    return new FilePatch(
      this.getNewPath(),
      this.getOldPath(),
      this.getNewMode(),
      this.getOldMode(),
      invertedStatus,
      invertedHunks
    )
  }

  getUnstagePatchForLines (selectedLines) {
    let delta = 0
    const hunks = []
    for (let hunk of this.getHunks()) {
      const oldStartRow = hunk.getOldStartRow() + delta
      let oldLineNumber = oldStartRow
      const lines = []
      for (let line of hunk.getLines()) {
        if (selectedLines.has(line)) {
          if (line.getStatus() === 'added') {
            lines.push(line.copy())
          } else {
            lines.push(line.copy({oldLineNumber: oldLineNumber++}))
          }
        } else if (line.getStatus() === 'added') {
          lines.push(line.copy({oldLineNumber: oldLineNumber++, status: 'unchanged'}))
        } else if (line.getStatus() === 'unchanged') {
          lines.push(line.copy({oldLineNumber: oldLineNumber++}))
        }
      }
      const oldRowCount = oldLineNumber - oldStartRow
      hunks.push(new Hunk(oldStartRow, hunk.getNewStartRow(), oldRowCount, hunk.getNewRowCount(), lines))
      delta += oldRowCount - hunk.getOldRowCount()
    }

    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
      this.getOldMode(),
      this.getNewMode(),
      this.getStatus(),
      hunks
    ).getUnstagePatch()
  }

  toString () {
    return this.getHunks().map(h => h.toString()).join('')
  }
}
