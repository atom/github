/** @babel */

import {Emitter} from 'atom'

export default class DiffSelection {
  constructor(diffViewModel, options) {
    this.diffViewModel = diffViewModel
    this.emitter = new Emitter()

    let {mode, headPosition, tailPosition} = options || {}
    this.mode = mode || 'hunk'
    this.headPosition = headPosition || [0, 0]
    this.tailPosition = tailPosition || null
  }

  static sortSelectionsAscending(selections) {
    selections = selections.slice(0)
    return selections.sort((selectionA, selectionB) => {
      return positionComparatorAsc(
        selectionA.getRange()[0],
        selectionB.getRange()[0]
      )
    })
  }

  static sortSelectionsDescending(selections) {
    selections = selections.slice(0)
    return selections.sort((selectionA, selectionB) => {
      return positionComparatorAsc(
        selectionB.getRange()[0],
        selectionA.getRange()[0]
      )
    })
  }

  getRange() {
    return [this.getHeadPosition(), this.getTailPosition()].sort(positionComparatorAsc)
  }

  getTailPosition() {
    return this.tailPosition || this.headPosition
  }

  setTailPosition(tailPosition) {
    this.tailPosition = tailPosition
    this.emitChangeEvent()
  }

  getHeadPosition() {
    return this.headPosition
  }

  setHeadPosition(headPosition) {
    this.headPosition = headPosition
    this.emitChangeEvent()
  }

  getFileDiffs() {
    return this.diffViewModel.getFileDiffs()
  }

  toggleMode() {
    let newMode = this.mode == 'hunk' ? 'line' : 'hunk'
    this.setMode(newMode)
  }

  getMode() {
    return this.mode
  }

  setMode(mode) {
    if (this.mode == mode) return

    this.mode = mode
    if (mode == 'line') {
      if (this.tailPosition) {
        // TODO: make this select all the lines in the selected hunks when the anchor is not the head
      }
      else {
        let [fileDiffIndex, diffHunkIndex] = this.headPosition
        this.headPosition = [fileDiffIndex, diffHunkIndex, this.getFirstChangedLineInHunk(this.headPosition) || 0]
      }
    }

    this.emitChangeEvent()
  }

  moveUp() {
    this.headPosition = this.getRange()[0]
    this.tailPosition = null
    this.moveHeadUp()
  }

  expandUp() {
    if(!this.tailPosition) this.tailPosition = this.headPosition
    this.moveHeadUp()
  }

  moveDown() {
    this.headPosition = this.getRange()[1]
    this.tailPosition = null
    this.moveHeadDown()
  }

  expandDown() {
    if(!this.tailPosition) this.tailPosition = this.headPosition
    this.moveHeadDown()
  }

  moveHeadUp() {
    if (this.mode == 'hunk')
      this.headPosition = this.getPreviousHunkPosition(this.headPosition)
    else
      this.headPosition = this.getPreviousChangedLinePosition(this.headPosition)
    this.emitChangeEvent()
  }

  moveHeadDown() {
    if (this.mode == 'hunk')
      this.headPosition = this.getNextHunkPosition(this.headPosition)
    else
      this.headPosition = this.getNextChangedLinePosition(this.headPosition)
    this.emitChangeEvent()
  }

  getPreviousHunkPosition(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition
    if (diffHunkIndex - 1 >= 0)
      return [fileDiffIndex, diffHunkIndex - 1]
    else if (fileDiffIndex - 1 >= 0)
      return [fileDiffIndex - 1, this.getFileDiffs()[fileDiffIndex - 1].getHunks().length - 1]
    else
      return hunkPosition
  }

  getNextHunkPosition(hunkPosition) {
    let [fileDiffIndex, diffHunkIndex] = hunkPosition

    let fileDiff = this.getFileDiffs()[fileDiffIndex]
    let diffHunks = fileDiff.getHunks()

    if (diffHunkIndex + 1 < diffHunks.length)
      return [fileDiffIndex, diffHunkIndex + 1]
    else if (fileDiffIndex + 1 < this.getFileDiffs().length)
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
      let lastHunkIndex = this.getFileDiffs()[fileDiffIndex - 1].getHunks().length - 1
      let lastLineIndex = this.getLastChangedLineInHunk([fileDiffIndex, lastHunkIndex])
      return [fileDiffIndex - 1, lastHunkIndex, lastLineIndex]
    }
    else
      return linePosition
  }

  getNextChangedLinePosition(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition

    let fileDiff = this.getFileDiffs()[fileDiffIndex]
    let diffHunks = fileDiff.getHunks()
    let diffHunk = diffHunks[diffHunkIndex]
    let hunkLines = diffHunk.getLines()

    let nextLineIndex = this.getNextChangedLineInHunk(linePosition)
    if (nextLineIndex != null)
      return [fileDiffIndex, diffHunkIndex, nextLineIndex]
    else if (diffHunkIndex + 1 < diffHunks.length)
      return [fileDiffIndex, diffHunkIndex + 1, this.getFirstChangedLineInHunk([fileDiffIndex, diffHunkIndex + 1]) || 0]
    else if (fileDiffIndex + 1 < this.getFileDiffs().length)
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
    let lines = this.getFileDiffs()[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
    for (var i = hunkLineIndex + 1; i < lines.length; i++)
      if (lines[i].isChanged())
        return i
    return null
  }

  getPreviousChangedLineInHunk(linePosition) {
    let [fileDiffIndex, diffHunkIndex, hunkLineIndex] = linePosition
    let lines = this.getFileDiffs()[fileDiffIndex].getHunks()[diffHunkIndex].getLines()
    for (var i = Math.min(lines.length, hunkLineIndex) - 1; i >= 0; i--)
      if (lines[i].isChanged())
        return i
    return null
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }
}

function positionComparatorAsc(posA, posB) {
  if (posA[0] != posB[0])
    return posA[0] - posB[0]
  else if (posA[1] != posB[1])
    return posA[1] - posB[1]
  else if (posA[2] != null && posB[2] != null && posA[2] != posB[2])
    return posA[2] - posB[2]
  return 0
}
