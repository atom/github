'use babel'

import {Point, CompositeDisposable} from 'atom'
import {diffLines} from 'diff'
import MarkerIndex from 'marker-index'
import temp from 'temp'

class ReviewCommentTracker {
  constructor (editor) {
    this.editor = editor
    this.invalidComments = new Map
    this.subscriptions = new CompositeDisposable()

    // TODO: change to onDidStopChanging
    this.editor.onDidSave(() => {
      let invalidComments = this.invalidComments
      this.invalidComments = new Map
      invalidComments.forEach(({fileContents, rowInFileContents}, id) => {
        this.track(id, fileContents, rowInFileContents)
      })
    })
  }

  destroy () {
    this.subscriptions.dispose()
  }

  track (id, fileContents, rowInFileContents) {
    let index = new MarkerIndex()
    index.insert(id, {row: rowInFileContents, column: 0}, {row: rowInFileContents + 1, column: 0})
    index.setExclusive(id, true)
    let currentRow = 0
    for (let change of diffLines(fileContents, this.editor.getText())) {
      if (change.added) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: 0, column: 0}, {row: change.count, column: 0})
        if (inside.has(id)) {
          this.invalidComments.set(id, {fileContents, rowInFileContents})
          return
        }
        // TODO: add specs
        // currentRow += change.count
      } else if (change.removed) {
        let {inside} = index.splice({row: currentRow, column: 0}, {row: change.count, column: 0}, {row: 0, column: 0})
        if (inside.has(id)) {
          this.invalidComments.set(id, {fileContents, rowInFileContents})
          return
        }
        // TODO: add specs
        // currentRow = Math.max(0, currentRow - change.count)
      } else {
        currentRow += change.count
      }
    }

    let marker = this.editor.markBufferRange(index.getRange(id), {reversed: true, invalidate: 'inside'})
    let subscription = marker.onDidChange(({isValid}) => {
      if (!isValid) {
        this.invalidComments.set(id, {fileContents, rowInFileContents})
        marker.destroy()
        subscription.dispose()
      }
    })
    this.editor.decorateMarker(marker, {type: 'block', position: 'after'})
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
    editor.setText('def\nghi\nABC\nDEF\nGHI\nopq\nrst')

    foo.track(1, 'abc\ndef\nghi\nlmn\nopq\nrst', 3)

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.setSelectedBufferRange([[4, 0], [4, 3]])
    editor.insertText('lmn')
    editor.saveAs(temp.path())

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])
  })

  it("removes decorations as soon as they become invalid and adds them back on save if they become valid again", () => {
    editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')

    foo.track(1, 'abc\ndef\nghi\nlmn\nopq\nrst', 3)
    editor.setCursorBufferPosition([4, 0])
    editor.deleteLine()

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    editor.saveAs(temp.path())

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])

    editor.redo()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.save()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    editor.save()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])
  })
})
