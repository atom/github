/** @babel */

import Hunk from './hunk'
import {Emitter} from 'atom'

export default class FilePatch {
  constructor (oldPath, newPath, status, hunks) {
    this.oldPath = oldPath
    this.newPath = newPath
    this.status = status
    this.hunks = hunks
    Object.defineProperty(this, 'destroyed', {value: false, enumerable: false, writable: true})
    Object.defineProperty(this, 'emitter', {value: new Emitter(), enumerable: false})
  }

  copy () {
    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
      this.getStatus(),
      this.getHunks().map(h => h.copy())
    )
  }

  destroy () {
    this.destroyed = true
    this.emitter.emit('did-destroy')
    this.emitter.dispose()
  }

  update (filePatch) {
    if (this.getPath() !== filePatch.getPath()) {
      throw new Error(`Cannot update file patch! This FilePatch path: ${this.getPath()} Other FilePatch path: ${filePatch.getPath()}`)
    }
    this.hunks = filePatch.getHunks()
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

  getOldPath () {
    return this.oldPath
  }

  getNewPath () {
    return this.newPath
  }

  getPath () {
    return this.getOldPath() || this.getNewPath()
  }

  getStatus () {
    return this.status
  }

  getHunks () {
    return this.hunks
  }

  getStagePatchForHunk (selectedHunk) {
    return this.getStagePatchForLines(new Set(selectedHunk.getLines()))
  }

  getStagePatchForLines (selectedLines) {
    let delta = 0
    const hunks = []
    for (let hunk of this.getHunks()) {
      const newStartRow = hunk.getNewStartRow() + delta
      let newLineNumber = newStartRow
      const lines = []
      let hunkContainsSelectedLines = false
      for (let line of hunk.getLines()) {
        if (selectedLines.has(line)) {
          hunkContainsSelectedLines = true
          if (line.getStatus() === 'deleted') {
            lines.push(line.copy())
          } else {
            lines.push(line.copy({newLineNumber: newLineNumber++}))
          }
        } else if (line.getStatus() === 'deleted') {
          lines.push(line.copy({newLineNumber: newLineNumber++, status: 'unchanged'}))
        } else if (line.getStatus() === 'unchanged') {
          lines.push(line.copy({newLineNumber: newLineNumber++}))
        }
      }
      const newRowCount = newLineNumber - newStartRow
      if (hunkContainsSelectedLines) {
        hunks.push(new Hunk(hunk.getOldStartRow(), newStartRow, hunk.getOldRowCount(), newRowCount, lines))
      }
      delta += newRowCount - hunk.getNewRowCount()
    }

    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
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
        invertedStatus = 'deleted'
        break
      case 'deleted':
        invertedStatus = 'added'
        break
      default:
        throw new Error(`Unknown Status: ${this.getStatus()}`)
    }
    const invertedHunks = this.getHunks().map(h => h.invert())
    return new FilePatch(
      this.getNewPath(),
      this.getOldPath(),
      invertedStatus,
      invertedHunks
    )
  }

  getUnstagePatchForHunk (hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getLines()))
  }

  getUnstagePatchForLines (selectedLines) {
    let delta = 0
    const hunks = []
    for (let hunk of this.getHunks()) {
      const oldStartRow = hunk.getOldStartRow() + delta
      let oldLineNumber = oldStartRow
      const lines = []
      let hunkContainsSelectedLines = false
      for (let line of hunk.getLines()) {
        if (selectedLines.has(line)) {
          hunkContainsSelectedLines = true
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
      if (hunkContainsSelectedLines) {
        hunks.push(new Hunk(oldStartRow, hunk.getNewStartRow(), oldRowCount, hunk.getNewRowCount(), lines))
      }
      delta += oldRowCount - hunk.getOldRowCount()
    }

    return new FilePatch(
      this.getOldPath(),
      this.getNewPath(),
      this.getStatus(),
      hunks
    ).getUnstagePatch()
  }

  toString () {
    return this.getHunks().map(h => h.toString()).join('')
  }

  getHeaderString () {
    let header = this.getOldPath() ? `--- a/${this.getOldPath()}` : '--- /dev/null'
    header += '\n'
    header += this.getNewPath() ? `+++ b/${this.getNewPath()}` : '+++ /dev/null'
    header += '\n'
    return header
  }
}
