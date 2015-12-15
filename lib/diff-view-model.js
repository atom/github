/** @babel */

import {Emitter, Range} from 'atom'
/*
selectionMode: ['line', 'hunk']
  selected: ['2', '3', '4:0', '4:1']
  moveNext()
  movePrev()
  moveSelectionDown()
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

  moveSelectionUp() {
    this.selectionAnchor = null
    this.moveSelectionHeadUp()
  }

  expandSelectionUp() {
    if(!this.selectionAnchor) this.selectionAnchor = this.selectionHead
    this.moveSelectionHeadUp()
  }

  moveSelectionDown() {
    this.selectionAnchor = null
    this.moveSelectionHeadDown()
  }

  expandSelectionDown() {
    if(!this.selectionAnchor) this.selectionAnchor = this.selectionHead
    this.moveSelectionHeadDown()
  }

  moveSelectionHeadUp() {
    if (this.selectionMode == 'hunk') {
      this.selectionHead = this.getPreviousHunkIndex(this.selectionHead)
      this.updateSelectionStateFromAnchorAndHead()
    }
  }

  moveSelectionHeadDown() {
    if (this.selectionMode == 'hunk') {
      this.selectionHead = this.getNextHunkIndex(this.selectionHead)
      this.updateSelectionStateFromAnchorAndHead()
    }
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
    this.selectionState = {}

    let selectionStart, selectionEnd
    let anchor = this.selectionAnchor || this.selectionHead
    let head = this.selectionHead
    if (anchor[0] < head[0] || (anchor[0] == head[0] && anchor[1] < head[1])){
      selectionStart = anchor
      selectionEnd = head
    }
    else {
      selectionStart = head
      selectionEnd = anchor
    }

    let fileDiffStart = selectionStart[0]
    let fileDiffEnd = selectionEnd[0]
    for (var fileDiffIndex = fileDiffStart; fileDiffIndex <= fileDiffEnd; fileDiffIndex++) {
      let fileDiff = this.fileDiffs[fileDiffIndex]
      let hunkStart = 0
      let hunkEnd = fileDiff.getHunks().length - 1
      if (fileDiffIndex == fileDiffStart) hunkStart = selectionStart[1]
      if (fileDiffIndex == fileDiffEnd) hunkEnd = selectionEnd[1]
      this.selectionState[fileDiffIndex] = {}
      for (var diffHunkIndex = hunkStart; diffHunkIndex <= hunkEnd; diffHunkIndex++) {
        this.selectionState[fileDiffIndex][diffHunkIndex] = true
      }
    }

    this.emitChangeEvent()
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
