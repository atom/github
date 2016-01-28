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
    this.selectionSubscriptions = new CompositeDisposable
    this.selection = selection
    this.selectionSubscriptions.add(this.selection.onDidChange(() => this.updateSelectionStateFromSelections()))
    this.updateSelectionStateFromSelections()
  }

  toggleSelectionMode() {
    this.selection.toggleMode()
  }

  getSelectionMode() {
    return this.selection.getMode()
  }

  setSelectionMode(mode) {
    this.selection.setMode(mode)
  }

  moveSelectionUp() {
    this.selection.moveUp()
  }

  expandSelectionUp() {
    this.selection.expandUp()
  }

  moveSelectionDown() {
    this.selection.moveDown()
  }

  expandSelectionDown() {
    this.selection.expandDown()
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
    this.updateSelectionStateFromSelection(this.selection)
  }

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
          this.selectionState[fileIndex][hunkIndex] = new Set()
          for (var lineIndex = lineStart; lineIndex <= lineEnd; lineIndex++)
            if (lines[lineIndex].isChanged())
              this.selectionState[fileIndex][hunkIndex].add(lineIndex)
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
