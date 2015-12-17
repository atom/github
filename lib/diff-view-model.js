/** @babel */

import {Emitter, Range} from 'atom'

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
    this.updateSelectionStateFromAnchorAndHead()
  }

  toggleSelectionMode() {
    let newSelectionMode = this.selectionMode == 'hunk' ? 'line' : 'hunk'
    this.setSelectionMode(newSelectionMode)
  }

  setSelectionMode(selectionMode) {
    if (this.selectionMode == selectionMode) return

    this.selectionMode = selectionMode
    if (selectionMode == 'line') {
      if (this.selectionAnchor) {
        // TODO: make this select all the lines in the selected hunks when the anchor is not the head
      }
      else {
        let [fileDiffIndex, diffHunkIndex] = this.selectionHead
        this.selectionHead = [fileDiffIndex, diffHunkIndex, this.getFirstChangedLineInHunk(this.selectionHead) || 0]
      }
    }

    this.updateSelectionStateFromAnchorAndHead()
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
    if (this.selectionMode == 'hunk')
      this.selectionHead = this.getPreviousHunkPosition(this.selectionHead)
    else
      this.selectionHead = this.getPreviousChangedLinePosition(this.selectionHead)
    this.updateSelectionStateFromAnchorAndHead()
  }

  moveSelectionHeadDown() {
    if (this.selectionMode == 'hunk')
      this.selectionHead = this.getNextHunkPosition(this.selectionHead)
    else
      this.selectionHead = this.getNextChangedLinePosition(this.selectionHead)
    this.updateSelectionStateFromAnchorAndHead()
  }

  getPreviousHunkPosition(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition
    if (diffHunkIndex - 1 >= 0)
      return [fileDiffIndex, diffHunkIndex - 1]
    else if (fileDiffIndex - 1 >= 0)
      return [fileDiffIndex - 1, this.fileDiffs[fileDiffIndex - 1].getHunks().length - 1]
    else
      return hunkPosition
  }

  getNextHunkPosition(hunkPosition) {
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

  getPreviousChangedLinePosition(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition
    let previousLineIndex = this.getPreviousChangedLineInHunk(linePosition)
    if (previousLineIndex != null)
      return [fileDiffIndex, diffHunkIndex, previousLineIndex]
    else if (diffHunkIndex - 1 >= 0)
      return [fileDiffIndex, diffHunkIndex - 1, this.getLastChangedLineInHunk([fileDiffIndex, diffHunkIndex - 1])]
    else if (fileDiffIndex - 1 >= 0) {
      let lastHunkIndex = this.fileDiffs[fileDiffIndex - 1].getHunks().length - 1
      let lastLineIndex = this.getLastChangedLineInHunk([fileDiffIndex, lastHunkIndex])
      return [fileDiffIndex - 1, lastHunkIndex, lastLineIndex]
    }
    else
      return linePosition
  }

  getNextChangedLinePosition(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition

    let fileDiff = this.fileDiffs[fileDiffIndex]
    let diffHunks = fileDiff.getHunks()
    let diffHunk = diffHunks[diffHunkIndex]
    let hunkLines = diffHunk.getLines()

    let nextLineIndex = this.getNextChangedLineInHunk(linePosition)
    if (nextLineIndex != null)
      return [fileDiffIndex, diffHunkIndex, nextLineIndex]
    else if (diffHunkIndex + 1 < diffHunks.length)
      return [fileDiffIndex, diffHunkIndex + 1, this.getFirstChangedLineInHunk([fileDiffIndex, diffHunkIndex + 1]) || 0]
    else if (fileDiffIndex + 1 < this.fileDiffs.length)
      return [fileDiffIndex + 1, 0, this.getFirstChangedLineInHunk([fileDiffIndex + 1, 0]) || 0]
    else
      return linePosition
  }

  getFirstChangedLineInHunk(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition
    return this.getNextChangedLineInHunk([fileDiffIndex, diffHunkIndex, -1])
  }

  getLastChangedLineInHunk(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition
    return this.getPreviousChangedLineInHunk([fileDiffIndex, diffHunkIndex, Number.MAX_VALUE])
  }

  getNextChangedLineInHunk(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition
    let lines = this.fileDiffs[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
    for (var i = hunkLineIndex + 1; i < lines.length; i++)
      if (lines[i].isChanged())
        return i
    return null
  }

  getPreviousChangedLineInHunk(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition
    let lines = this.fileDiffs[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
    for (var i = Math.min(lines.length, hunkLineIndex) - 1; i >= 0; i--)
      if (lines[i].isChanged())
        return i
    return null
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

    // console.log("S"+selectionStart);
    // console.log("E"+selectionEnd);

    // Well, this turned out to be really not straightforward.
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

        if (this.selectionMode == 'hunk')
          this.selectionState[fileDiffIndex][diffHunkIndex] = true
        else {
          let diffHunk = fileDiff.getHunks()[diffHunkIndex]
          let lineStart = 0
          let lineEnd = fileDiff.getHunks().length - 1
          if (diffHunkIndex == hunkStart) lineStart = selectionStart[2]
          if (diffHunkIndex == hunkEnd) lineEnd = selectionEnd[2]
          this.selectionState[fileDiffIndex][diffHunkIndex] = new Set()
          for (var hunkLineIndex = lineStart; hunkLineIndex <= lineEnd; hunkLineIndex++)
            this.selectionState[fileDiffIndex][diffHunkIndex].add(hunkLineIndex)
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
    if (diffHunk.getStageStatus() == 'staged')
      diffHunk.unstage()
    else // unstaged and partial hunks will be fully staged
      diffHunk.stage()
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
