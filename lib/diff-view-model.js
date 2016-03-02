/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import DiffSelection from './diff-selection'
import DiffHunk from './diff-hunk'
import {ifNotNull} from './common'

import type {Disposable} from 'atom'
import type FileList from './file-list'
import type FileDiff from './file-diff'
import type FileDiffViewModel from './file-diff-view-model'
import type {SelectionMode} from './diff-selection'

export default class DiffViewModel {
  uri: string;
  pathName: string;
  deserializer: string;
  fileDiffViewModel: FileDiffViewModel;
  fileList: FileList;
  pending: boolean;
  selectionMode: SelectionMode;
  emitter: Emitter;
  selections: Array<DiffSelection>;
  selectionSubscriptions: CompositeDisposable;
  selectionState: Object;

  constructor ({uri, pathName, deserializer, fileDiffViewModel, fileList, pending}: {uri: string, pathName: string, deserializer: string, fileDiffViewModel: FileDiffViewModel, fileList: FileList, pending: boolean}) {
    // TODO: I kind of hate that the URI and deserializer string are in this
    // model. Worth creating another model on top of this?
    this.uri = uri
    this.pathName = pathName
    this.deserializer = deserializer
    this.pending = pending
    this.fileDiffViewModel = fileDiffViewModel
    this.fileList = fileList
    this.fileList.onDidChange(this.emitChangeEvent.bind(this))

    // mode is stored here _and_ in the selection. Mouse interactions store
    // line-mode selections, but moving the keyboard interactions into line mode
    // after every mouse interaction feels weird.
    this.selectionMode = 'hunk'
    this.emitter = new Emitter()
    this.setSelection(new DiffSelection(this))
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  onDidTerminatePendingState (callback: Function): Disposable {
    return this.emitter.on('did-terminate-pending-state', callback)
  }

  emitChangeEvent () {
    this.emitter.emit('did-change')
  }

  setSelection (selection: DiffSelection) {
    if (this.selectionSubscriptions) {
      this.selectionSubscriptions.dispose()
    }
    this.selections = []
    this.selectionSubscriptions = new CompositeDisposable()
    this.addSelection(selection)
  }

  addSelection (selection: DiffSelection) {
    this.selections.push(selection)
    this.selectionSubscriptions.add(selection.onDidChange(() => this.updateSelectionStateFromSelections()))
    this.updateSelectionStateFromSelections()
  }

  getSelections (): Array<DiffSelection> {
    return this.selections
  }

  getLastSelection (): ?DiffSelection {
    return this.selections[this.selections.length - 1]
  }

  toggleSelectionMode () {
    let newMode = this.selectionMode === 'hunk' ? 'line' : 'hunk'
    this.setSelectionMode(newMode)
  }

  getSelectionMode (): SelectionMode {
    return this.selectionMode
  }

  setSelectionMode (mode: SelectionMode) {
    this.selectionMode = mode
    this.mergeOnLastSelection()
    this.updateSelectionStateFromSelections()
  }

  moveSelectionUp () {
    this.mergeOnTopSelection()
    this.selections[0].moveUp()
  }

  expandSelectionUp () {
    this.mergeOnTopSelection()
    this.selections[0].expandUp()
  }

  moveSelectionDown () {
    this.mergeOnBottomSelection()
    this.selections[0].moveDown()
  }

  expandSelectionDown () {
    this.mergeOnBottomSelection()
    this.selections[0].expandDown()
  }

  mergeOnTopSelection () {
    if (this.selections.length > 1) {
      let topSelection = DiffSelection.sortSelectionsAscending(this.selections)[0]
      this.selections = [topSelection]
    }
    this.selections[0].setMode(this.selectionMode)
  }

  mergeOnBottomSelection () {
    if (this.selections.length > 1) {
      let bottomSelection = DiffSelection.sortSelectionsDescending(this.selections)[0]
      this.selections = [bottomSelection]
    }
    this.selections[0].setMode(this.selectionMode)
  }

  mergeOnLastSelection () {
    if (this.selections.length > 1) {
      let lastSelection = this.getLastSelection()
      if (lastSelection) {
        this.selections = [lastSelection]
      }
    }
    this.selections[0].setMode(this.selectionMode)
  }

  // Called a bunch by the views. Each {HunkLine} calls it everytime there is a
  // model update.
  isLineSelected (fileDiffIndex: number, fileHunkIndex: number, index: number): boolean {
    if (this.selectionState[fileDiffIndex] != null && this.selectionState[fileDiffIndex][fileHunkIndex] != null) {
      let lines = this.selectionState[fileDiffIndex][fileHunkIndex]
      if (lines instanceof Set) {
        return lines.has(index)
      } else if (lines) {
        return true
      }
    }
    return false
  }

  updateSelectionStateFromSelections () {
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
  updateSelectionStateFromSelection (selection: DiffSelection) {
    let [selectionStart, selectionEnd] = selection.getRange()

    // Well, this turned out to be really not straightforward.
    let fileStart = selectionStart[0]
    let fileEnd = selectionEnd[0]
    for (let fileIndex = fileStart; fileIndex <= fileEnd; fileIndex++) {
      let file = this.getFileDiffs()[fileIndex]
      let hunkStart = 0
      let hunkEnd = file.getHunks().length - 1
      if (fileIndex === fileStart) hunkStart = selectionStart[1]
      if (fileIndex === fileEnd) hunkEnd = selectionEnd[1]
      if (!this.selectionState[fileIndex]) {
        this.selectionState[fileIndex] = {}
      }
      for (let hunkIndex = hunkStart; hunkIndex <= hunkEnd; hunkIndex++) {
        if (selection.getMode() === 'hunk') {
          this.selectionState[fileIndex][hunkIndex] = true
        } else {
          let hunk = file.getHunks()[hunkIndex]
          let lines = hunk.getLines()
          let lineStart = 0
          let lineEnd = lines.length - 1
          if (fileIndex === fileStart && hunkIndex === hunkStart) {
            lineStart = selectionStart[2]
          }
          if (fileIndex === fileEnd && hunkIndex === hunkEnd) {
            lineEnd = selectionEnd[2]
          }
          let lineState = this.selectionState[fileIndex][hunkIndex]
          if (!lineState || lineState.constructor !== Set) {
            this.selectionState[fileIndex][hunkIndex] = lineState = new Set()
          }
          // $FlowFixMe: Sure
          for (let lineIndex = lineStart; lineIndex <= lineEnd; lineIndex++) {
            // $FlowFixMe: Sure
            if (lines[lineIndex].isChanged()) {
              lineState.add(lineIndex)
            }
          }
        }
      }
    }

    this.emitChangeEvent()
  }

  toggleSelectedLinesStageStatus () {
    for (let fileDiffIndex in this.selectionState) {
      fileDiffIndex = parseInt(fileDiffIndex, 10)
      let fileDiff = this.getFileDiffs()[fileDiffIndex]
      let selectedHunkIndices = this.selectionState[fileDiffIndex]
      // Transact on the fileDiff because they are shared between FileLists
      fileDiff.transact(() => {
        for (let diffHunkIndex in selectedHunkIndices) {
          diffHunkIndex = parseInt(diffHunkIndex, 10)
          let selectedHunk = fileDiff.getHunks()[diffHunkIndex]
          let selectedLineIndices = selectedHunkIndices[diffHunkIndex]
          if (selectedLineIndices instanceof Set) {
            this.toggleLinesStageStatus(selectedHunk, selectedLineIndices)
          } else if (selectedLineIndices) {
            this.toggleHunkStageStatus(selectedHunk)
          }
        }
      })
    }
  }

  toggleLinesStageStatus (diffHunk: DiffHunk, lineIndices: Array<number>) {
    // This will just toggle each line. It's probably a stupid way to do it
    let lines = diffHunk.getLines()
    for (let lineIndex of lineIndices.values()) {
      lines[lineIndex].setIsStaged(!lines[lineIndex].isStaged())
    }
  }

  toggleHunkStageStatus (diffHunk: DiffHunk) {
    if (diffHunk.getStageStatus() === 'unstaged') {
      diffHunk.stage()
    } else { // staged and partial hunks will be fully unstaged
      diffHunk.unstage()
    }
  }

  getFileDiffs (): Array<FileDiff> {
    return this.fileList.getFiles()
  }

  openFileAtSelection () {
    // TODO: this is maybe a naive line-choosing approach. Basically picks the
    // first line of the most recent selection. It could look for an addition,
    // and if not found, it'll use the deleted line. Depends on how this feels
    const selection = this.getLastSelection()
    if (!selection) return

    const [firstPosition] = selection.getRange()
    const pathName = this.getFileDiffs()[firstPosition[0]].getNewPathName()
    const lineOrHunk = this.fileList.getObjectAtPosition(firstPosition)

    let lineObject
    if (lineOrHunk instanceof DiffHunk) {
      lineObject = lineOrHunk.getFirstChangedLine()
    } else {
      lineObject = lineOrHunk
    }

    const initialLine = (ifNotNull(lineObject, l => l.getNewLineNumber()) || ifNotNull(lineObject, l => l.getOldLineNumber()) || 0) - 1
    if (pathName) {
      atom.workspace.open(pathName, {initialLine})
    }
  }

  /*
  Section: Pane Item Functions

  These are here just so this model can serve as an Atom pane item
  */

  getTitle (): string {
    return `Diff: ${this.fileDiffViewModel.getTitle()}`
  }

  getURI (): string {
    return this.uri
  }

  getPath (): string {
    return `diff:${this.pathName}`
  }

  isPending (): boolean {
    return this.pending
  }

  terminatePendingState () {
    if (this.pending) {
      this.pending = false
      this.emitter.emit('did-terminate-pending-state')
    }
  }

  serialize (): Object {
    return {
      uri: this.uri,
      deserializer: this.deserializer,
      pending: this.pending
    }
  }
}
