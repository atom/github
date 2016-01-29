/** @babel */

import {Emitter, CompositeDisposable} from 'atom'
import DiffSelection from './diff-selection'

export default class DiffViewModel {
  constructor({fileDiffs, uri, title}) {
    this.uri = uri
    this.fileDiffs = fileDiffs

    this.title = title
    if (!this.title) {
      this.title = fileDiffs[0].getNewPathName()
    }

    this.emitter = new Emitter()
    this.setSelection(new DiffSelection(this))
  }

  setSelection(selection) {
    if (this.selectionSubscriptions)
      this.selectionSubscriptions.dispose()
    this.selections = []
    this.selectionSubscriptions = new CompositeDisposable
    this.addSelection(selection)
  }

  addSelection(selection) {
    this.selections.push(selection)
    this.selectionSubscriptions.add(selection.onDidChange(() => this.updateSelectionStateFromSelections()))
    this.updateSelectionStateFromSelections()
  }

  toggleSelectionMode() {
    this.selections[0].toggleMode()
  }

  getSelectionMode() {
    return this.selections[0].getMode()
  }

  setSelectionMode(mode) {
    this.selections[0].setMode(mode)
  }

  moveSelectionUp() {
    this.selections[0].moveUp()
  }

  expandSelectionUp() {
    this.selections[0].expandUp()
  }

  moveSelectionDown() {
    this.selections[0].moveDown()
  }

  expandSelectionDown() {
    this.selections[0].expandDown()
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

  updateSelectionStateFromSelections() {
    this.selectionState = {}
    for (let selection of this.selections) {
      this.updateSelectionStateFromSelection(selection)
    }
  }

  // Converts the Selection object's positions into an object for efficient
  // lookup by `::isLineSelected(fileIndex, hunkIndex, lineIndex)`
  //
  // Creates an object in `this.selectionState`. For hunk selection, the object
  // is similar to:
  //
  // {
  //   0: {
  //     3: true,
  //     4: true
  //   }
  // }
  //
  // This indicates that file[0].hunk[3] and file[0].hunk[4] are selected. For
  // line selection, a Set is used:
  //
  // {
  //   0: {
  //     3: Set([1, 3, 5]),
  //     4: Set([3, 4, 5])
  //   }
  // }
  //
  // This indicates that file[0].hunk[3].line[1|3|5] are selected, etc.
  updateSelectionStateFromSelection(selection) {
    let [selectionStart, selectionEnd] = selection.getRange()

    // Well, this turned out to be really not straightforward.
    let fileStart = selectionStart[0]
    let fileEnd = selectionEnd[0]
    for (var fileIndex = fileStart; fileIndex <= fileEnd; fileIndex++) {

      let file = this.fileDiffs[fileIndex]
      let hunkStart = 0
      let hunkEnd = file.getHunks().length - 1
      if (fileIndex == fileStart) hunkStart = selectionStart[1]
      if (fileIndex == fileEnd) hunkEnd = selectionEnd[1]
      if (!this.selectionState[fileIndex])
        this.selectionState[fileIndex] = {}
      for (var hunkIndex = hunkStart; hunkIndex <= hunkEnd; hunkIndex++) {

        if (selection.getMode() == 'hunk')
          this.selectionState[fileIndex][hunkIndex] = true
        else {
          let hunk = file.getHunks()[hunkIndex]
          let lines = hunk.getLines()
          let lineStart = 0
          let lineEnd = lines.length - 1
          if (fileIndex == fileStart && hunkIndex == hunkStart)
            lineStart = selectionStart[2]
          if (fileIndex == fileEnd && hunkIndex == hunkEnd)
            lineEnd = selectionEnd[2]
          lineState = this.selectionState[fileIndex][hunkIndex]
          if (!lineState || lineState.constructor != Set)
            this.selectionState[fileIndex][hunkIndex] = lineState = new Set()
          for (var lineIndex = lineStart; lineIndex <= lineEnd; lineIndex++)
            if (lines[lineIndex].isChanged())
              lineState.add(lineIndex)
        }

      }
    }

    this.emitChangeEvent()
  }

  toggleSelectedLinesStageStatus() {
    for (let fileDiffIndex in this.selectionState) {
      let selectedHunkIndices = this.selectionState[fileDiffIndex]
      for (let diffHunkIndex in selectedHunkIndices) {
        let selectedHunk = this.fileDiffs[fileDiffIndex].getHunks()[diffHunkIndex]
        let selectedLineIndices = selectedHunkIndices[diffHunkIndex]
        if (selectedLineIndices instanceof Set)
          this.toggleLinesStageStatus(selectedHunk, selectedLineIndices)
        else if (selectedLineIndices)
          this.toggleHunkStageStatus(selectedHunk)
      }
    }
  }

  toggleLinesStageStatus(diffHunk, lineIndices) {
    // This will just toggle each line. It's probably a stupid way to do it
    let lines = diffHunk.getLines()
    for (let lineIndex of lineIndices.values()) {
      lines[lineIndex].setIsStaged(!lines[lineIndex].isStaged())
    }
  }

  toggleHunkStageStatus(diffHunk) {
    if (diffHunk.getStageStatus() == 'unstaged')
      diffHunk.stage()
    else // staged and partial hunks will be fully unstaged
      diffHunk.unstage()
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
