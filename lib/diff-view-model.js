/** @babel */

import {Emitter, Range} from 'atom'
/*
selectionMode: ['line', 'hunk']
  selected: ['2', '3', '4:0', '4:1']
  moveNext()
  movePrev()
  selectNext()
  selectPrev()
*/

export default class DiffViewModel {
  constructor({fileDiffs, uri, title}) {
    this.uri = uri
    this.fileDiffs = fileDiffs

    this.title = title
    if (!this.title) {
      this.title = fileDiffs[0].getNewPathName()
    }

    this.emitter = new Emitter()

    this.selectionMode = 'hunk'
    this.selectionAnchor = null
    this.selectionHead = [0, 0]
    this.selectionState = {
      0: {
        0: true
      }
    }
  }

  isLineSelected(fileDiffIndex, fileHunkIndex, index) {
    if (this.selectionState[fileDiffIndex] != null && this.selectionState[fileDiffIndex][fileHunkIndex] != null) {
      let lines = this.selectionState[fileDiffIndex][fileHunkIndex]
      if (lines instanceof Set)
        return lines.has(index)
      else if (lines)
        return true
    }
    return false
  }

  selectPrevious() {
    if (this.selectionMode == 'hunk') {
      this.selectionHead = this.getPreviousHunkIndex(this.selectionHead)
      this.updateSelectionStateFromAnchorAndHead()
    }
    this.emitChangeEvent()
  }

  selectNext() {
    if (this.selectionMode == 'hunk') {
      this.selectionHead = this.getNextHunkIndex(this.selectionHead)
      this.updateSelectionStateFromAnchorAndHead()
    }
    this.emitChangeEvent()
  }

  getPreviousHunkIndex(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition
    if (diffHunkIndex - 1 >= 0)
      return [fileDiffIndex, diffHunkIndex - 1]
    else if (fileDiffIndex - 1 >= 0)
      return [fileDiffIndex - 1, this.fileDiffs[fileDiffIndex - 1].getHunks().length - 1]
    else
      return hunkPosition
  }

  getNextHunkIndex(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition

    let fileDiff = this.fileDiffs[fileDiffIndex]
    let diffHunks = fileDiff.getHunks()

    if (diffHunkIndex + 1 < diffHunks.length)
      return [fileDiffIndex, diffHunkIndex + 1]
    else if (fileDiffIndex + 1 < this.fileDiffs.length)
      return [fileDiffIndex + 1, 0]
    else
      return hunkPosition
  }

  updateSelectionStateFromAnchorAndHead() {
    let [fileDiffIndex, diffHunkIndex] = this.selectionHead
    this.selectionState = {}
    this.selectionState[fileDiffIndex] = {}
    this.selectionState[fileDiffIndex][diffHunkIndex] = true
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }

  getTitle() {
    return `Diff: ${this.title}`
  }

  getURI() {
    return this.uri
  }

  getFileDiffs() {
    return this.fileDiffs
  }
}
