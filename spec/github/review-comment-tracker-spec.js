'use babel'

import {Range, CompositeDisposable} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'
import temp from 'temp'

class ReviewCommentTracker {
  constructor (editor) {
    this.editor = editor
    this.invalidCommentsByCommitId = new Map()
    this.contentsByCommitId = new Map()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.editor.onDidStopChanging(() => {
      let invalidCommentsByCommitId = this.invalidCommentsByCommitId
      this.invalidCommentsByCommitId = new Map()
      for (let [commitId, rowsByCommentId] of invalidCommentsByCommitId) {
        this.trackCommentsForCommitId(commitId, this.contentsByCommitId.get(commitId), rowsByCommentId)
      }
    }))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  trackCommentsForCommitId (commitId, bufferContents, rowsByCommentId) {
    let index = new MarkerIndex()
    for (let [id, row] of rowsByCommentId) {
      index.insert(id, {row: row, column: 0}, {row: row + 1, column: 0})
      index.setExclusive(id, true)
    }

    let currentRow = 0
    for (let change of diffLines(bufferContents, this.editor.getText())) {
      if (change.added) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        for (let id of inside) {
          this.invalidate(commitId, bufferContents, id, rowsByCommentId.get(id))
          index.delete(id)
        }

        currentRow += change.count
      } else if (change.removed) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        for (let id of inside) {
          this.invalidate(commitId, bufferContents, id, rowsByCommentId.get(id))
          index.delete(id)
        }
      } else {
        currentRow += change.count
      }
    }

    let rangesByCommentId = index.dump()
    for (let _id of Object.keys(rangesByCommentId)) {
      let id = parseInt(_id)
      let range = Range.fromObject(rangesByCommentId[id])
      let marker = this.editor.markBufferRange(range, {reversed: true, invalidate: 'inside'})
      let subscription = marker.onDidChange(({isValid}) => {
        if (!isValid) {
          this.invalidate(commitId, bufferContents, id, rowsByCommentId.get(id))
          marker.destroy()
          subscription.dispose()
        }
      })
      this.editor.decorateMarker(marker, {type: 'block', position: 'after'})
    }
  }

  track (id, fileContents, rowInFileContents) {
    // throw new Error("Don't use this interface. Use trackCommentsForCommitId()")
    let map = new Map()
    map.set(id, rowInFileContents)
    this.trackCommentsForCommitId(1234, fileContents, map)
  }

  invalidate (commitId, bufferContents, id, row) {
    if (!this.contentsByCommitId.has(commitId)) {
      this.contentsByCommitId.set(commitId, bufferContents)
    }

    if (!this.invalidCommentsByCommitId.has(commitId)) {
      this.invalidCommentsByCommitId.set(commitId, new Map())
    }

    this.invalidCommentsByCommitId.get(commitId).set(id, row)
  }
}

describe('ReviewCommentTracker', () => {
  let editor, foo

  beforeEach(() => {
    editor = atom.workspace.buildTextEditor()
    foo = new ReviewCommentTracker(editor)
  })

  it("adds a decoration on the same row when the buffers' contents match", () => {
    editor.setText('abc\ndef\nghi')

    foo.track(1, 'abc\ndef\nghi', 1)

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([1, 0])
  })

  it("adds a decoration on a translated row in the current buffer corresponding to row in the original buffer", () => {
    editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')

    foo.track(1, 'abc\ndef\nghi\nlmn\nopq\nrst', 3)

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])

    editor.setCursorBufferPosition([4, 0])
    editor.insertNewline()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([5, 0])
  })

  it("doesn't add a decoration when the comment position doesn't exist anymore, and adds it back on save if it becomes valid again", () => {
    editor.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')

    foo.track(1, 'abc\ndef\nghi\nlmn\nopq\nrst', 3)

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.setSelectedBufferRange([[6, 0], [6, 3]])
    editor.insertText('lmn')
    advanceClock(editor.buffer.stoppedChangingDelay)

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([6, 0])
  })

  it("removes decorations as soon as they become invalid and adds them back on save if they become valid again", () => {
    editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')

    foo.track(1, 'abc\ndef\nghi\nlmn\nopq\nrst', 3)
    editor.setCursorBufferPosition([4, 0])
    editor.deleteLine()

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    advanceClock(editor.buffer.stoppedChangingDelay)

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])

    editor.redo()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    advanceClock(editor.buffer.stoppedChangingDelay)

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    advanceClock(editor.buffer.stoppedChangingDelay)

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])
  })
})
