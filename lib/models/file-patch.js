/** @babel */

import Hunk from './hunk'
import {Emitter} from 'atom'
import {Diff} from 'diff'

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

  update (filePatch) {
    if (this.getId() !== filePatch.getId()) {
      throw new Error(`Cannot update file patch! This FilePatch Id: ${this.getId()} Other FilePatch Id: ${filePatch.getId()}`)
    }

    const newHunks = filePatch.getHunks()
    let oldHunkIndex = 0
    let newHunkIndex = 0
    for (let diff of diffHunks(this.hunks, newHunks)) {
      if (diff.removed) {
        this.hunks.splice(oldHunkIndex, diff.count)
      } else if (diff.added) {
        this.hunks.splice(oldHunkIndex, 0, ...newHunks.slice(newHunkIndex, newHunkIndex + diff.count))
        newHunkIndex += diff.count
        oldHunkIndex += diff.count
      } else {
        for (let i = 0; i < diff.count; i++) {
          this.hunks[oldHunkIndex].update(newHunks[newHunkIndex])
          newHunkIndex++
          oldHunkIndex++
        }
      }
    }

    this.oldMode = filePatch.getOldMode()
    this.newMode = filePatch.getNewMode()
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
    return `a/${this.getOldPath()} b/${this.getNewPath()}`
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
      if (hunkContainsSelectedLines) {
        hunks.push(new Hunk(hunk.getOldStartRow(), newStartRow, hunk.getOldRowCount(), newRowCount, lines))
      }
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
      this.getOldMode(),
      this.getNewMode(),
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
    header += this.getNewPath() ? `+++ b/${this.getNewPath()}` : '--- /dev/null'
    header += '\n'
    return header
  }
}

function diffHunks (oldHunks, newHunks) {
  let idCounter = 0
  const hunksById = new Map()
  const hunkDiff = new Diff()
  hunkDiff.equals = (l, r) => {
    const left = hunksById.get(l.trim())
    const right = hunksById.get(r.trim())
    return (left != null && right != null) ? left.sharesLinesWith(right) : false
  }
  hunkDiff.tokenize = (hunks) => hunks.map(h => {
    const id = (idCounter++).toString()
    hunksById.set(id, h)
    return id + '\n'
  })

  const results = hunkDiff.diff(oldHunks, newHunks)
  for (let diff of results) {
    diff.value = diff.value.trim().split('\n').map(h => hunksById.get(h))
  }
  return results
}
