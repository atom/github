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
    this.selected = {
      0: {
        0: true
      }
    }
  }

  isLineSelected(fileDiffIndex, fileHunkIndex, index) {
    if (this.selected[fileDiffIndex] != null && this.selected[fileDiffIndex][fileHunkIndex] != null) {
      let lines = this.selected[fileDiffIndex][fileHunkIndex]
      if (lines instanceof Set)
        return lines.has(index)
      else if (lines)
        return true
    }
    return false
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
