'use babel'

import EditorReviewComments from '../../lib/github/review-comment/editor-review-comments'

describe('EditorReviewComments', () => {
  let editor, editorReviewComments

  beforeEach(() => {
    editor = atom.workspace.buildTextEditor()
    editorReviewComments = new EditorReviewComments(editor)
  })

  it("adds a decoration on the same row when the buffers' contents match", () => {
    editor.setText('abc\ndef\nghi')

    editorReviewComments.add('commit_id', 'abc\ndef\nghi', new Map().set(1, 1))

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([1, 0])
  })

  it("adds a decoration on a translated row in the current buffer corresponding to row in the original buffer", () => {
    editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')

    editorReviewComments.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, 3))

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])

    editor.setCursorBufferPosition([4, 0])
    editor.insertNewline()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([5, 0])
  })

  it("doesn't add a decoration when the comment is already outdated, but adds it on `refreshOutdated()` if it becomes valid again", () => {
    editor.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')

    editorReviewComments.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, 3))

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.setSelectedBufferRange([[6, 0], [6, 3]])
    editor.insertText('lmn')
    editorReviewComments.refreshOutdated()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([6, 0])
  })

  it("removes decorations if they become outdated after a buffer change and adds them back on `refreshOutdated()` if they become valid again", () => {
    editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')

    editorReviewComments.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, 3))
    editor.setCursorBufferPosition([4, 0])
    editor.deleteLine()

    let decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    editorReviewComments.refreshOutdated()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])

    editor.redo()
    editorReviewComments.refreshOutdated()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(0)

    editor.undo()
    editorReviewComments.refreshOutdated()

    decorations = editor.getDecorations({type: 'block'})
    expect(decorations.length).toBe(1)
    expect(decorations[0].getMarker().getHeadBufferPosition()).toEqual([4, 0])
  })
})
