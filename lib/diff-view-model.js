/** @babel */

import {Emitter, CompositeDisposable} from 'atom'
import DiffSelection from './diff-selection'
import DiffHunk from './diff-hunk'

export default class DiffViewModel {
  constructor({uri, deserializer, title, fileList}) {
    // TODO: I kind of hate that the URI and deserializer string are in this
    // model. Worth creating another model on top of this?
    this.uri = uri
    this.deserializer = deserializer
    this.fileList = fileList
    this.fileList.onDidChange(this.emitChangeEvent.bind(this))

    this.title = title
    if (!this.title) {
      this.title = this.fileList.getFiles()[0].getNewPathName()
    }

    // mode is stored here _and_ in the selection. Mouse interactions store
    // line-mode selections, but moving the keyboard interactions into line mode
    // after every mouse interaction feels weird.
    this.selectionMode = 'hunk'
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

  getSelections() {
    return this.selections
  }

  getLastSelection() {
    return this.selections[this.selections.length - 1]
  }

  toggleSelectionMode() {
    let newMode = this.selectionMode == 'hunk' ? 'line' : 'hunk'
    this.setSelectionMode(newMode)
  }

  getSelectionMode() {
    return this.selectionMode
  }

  setSelectionMode(mode) {
    this.selectionMode = mode
    this.mergeOnLastSelection()
    this.updateSelectionStateFromSelections()
  }

  moveSelectionUp() {
    this.mergeOnTopSelection()
    this.selections[0].moveUp()
  }

  expandSelectionUp() {
    this.mergeOnTopSelection()
    this.selections[0].expandUp()
  }

  moveSelectionDown() {
    this.mergeOnBottomSelection()
    this.selections[0].moveDown()
  }

  expandSelectionDown() {
    this.mergeOnBottomSelection()
    this.selections[0].expandDown()
  }

  mergeOnTopSelection() {
    if (this.selections.length > 1) {
      let topSelection = DiffSelection.sortSelectionsAscending(this.selections)[0]
      this.selections = [topSelection]
    }
    this.selections[0].setMode(this.selectionMode)
  }

  mergeOnBottomSelection() {
    if (this.selections.length > 1) {
      let bottomSelection = DiffSelection.sortSelectionsDescending(this.selections)[0]
      this.selections = [bottomSelection]
    }
    this.selections[0].setMode(this.selectionMode)
  }

  mergeOnLastSelection() {
    if (this.selections.length > 1) {
      let lastSelection = this.getLastSelection()
      this.selections = [lastSelection]
    }
    this.selections[0].setMode(this.selectionMode)
  }

  // Called a bunch by the views. Each {HunkLine} calls it everytime there is a
  // model update.
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

      let file = this.getFileDiffs()[fileIndex]
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
        let selectedHunk = this.getFileDiffs()[fileDiffIndex].getHunks()[diffHunkIndex]
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

  getFileDiffs() {
    return this.fileList.getFiles()
  }

  openFileAtSelection() {
    // TODO: this is maybe a naive line-choosing approach. Basically picks the
    // first line of the most recent selection. It could look for an addition,
    // and if not found, it'll use the deleted line. Depends on how this feels
    const selection = this.getLastSelection()
    const [firstPosition, secondPosition] = selection.getRange()
    const pathName = this.getFileDiffs()[firstPosition[0]].getNewPathName()
    const lineOrHunk = this.fileList.getObjectAtPosition(firstPosition)

    let lineObject
    if (lineOrHunk instanceof DiffHunk)
      lineObject = lineOrHunk.getFirstChangedLine()
    else
      lineObject = lineOrHunk

    initialLine = (lineObject.getNewLineNumber() || lineObject.getOldLineNumber()) - 1
    atom.workspace.open(pathName, {initialLine})
  }

  /*
  Section: Pane Item Functions

  These are here just so this model can serve as an Atom pane item
  */

  getTitle() {
    return `Diff: ${this.title}`
  }

  getURI() {
    return this.uri
  }

  serialize() {
    return {
      deserializer: this.deserializer,
      uri: this.uri,
    }
  }
}
