'use babel'

import EditorReviewCommentsPositioner from '../../lib/github/review-comment/editor-review-comment-positioner'

describe('EditorReviewCommentsPositioner', () => {
  let editor, reviewCommentPositioner, addCallback, invalidateCallback

  beforeEach(() => {
    editor = atom.workspace.buildTextEditor()
    reviewCommentPositioner = new EditorReviewCommentsPositioner(editor)
    addCallback = jasmine.createSpy()
    reviewCommentPositioner.onDidAddComment(addCallback)
    invalidateCallback = jasmine.createSpy()
    reviewCommentPositioner.onDidInvalidateComment(invalidateCallback)
  })

  describe('::add(commitId, commitBufferContents, commentsById)', () => {
    describe('when a comment doesn\'t have a row', () => {
      it('throws an exception', () => {
        const comment = {}
        expect(() => reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, comment))).toThrow()
      })
    })

    describe('when the buffer contents match', () => {
      it('calls onDidAddComment listener with same row', () => {
        editor.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].marker.getBufferRange()).toEqual([[1, 0], [1, 3]])
      })
    })

    describe('when the buffer contents differ from comment\'s original commit', () => {
      it('calls onDidAddComment listener with translated row', () => {
        editor.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].marker.getBufferRange()).toEqual([[4, 0], [4, 3]])
      })
    })

    describe('when the buffer contents no longer has content comment refers to', () => {
      it('doesn\'t call onDidAddComment listener', () => {
        editor.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(0)
      })
    })

    describe('when the comment becomes valid again after `refreshOutdated()`', () => {
      it('calls onDidAddComment listener with the correct row', () => {
        editor.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(0)

        editor.getBuffer().insert([7, 0], 'lmn\n')
        reviewCommentPositioner.refreshOutdated()
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].marker.getBufferRange()).toEqual([[7, 0], [7, 3]])
      })
    })
  })

  describe('when comments are invalidated', () => {
    describe('when comment line is deleted', () => {
      it('calls ::onDidInvalidateComment callback with comment id', () => {
        const addCallback = jasmine.createSpy()
        reviewCommentPositioner.onDidAddComment(addCallback)
        const invalidateCallback = jasmine.createSpy()
        reviewCommentPositioner.onDidInvalidateComment(invalidateCallback)

        editor.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)

        editor.getBuffer().deleteRow(1)
        expect(invalidateCallback.callCount).toBe(1)
        expect(invalidateCallback.argsForCall[0][0]).toBe(1)
      })
    })

    describe('when then text content in the row is changed', () => {
      it('calls ::onDidInvalidateComment callback with comment id', () => {
        const addCallback = jasmine.createSpy()
        reviewCommentPositioner.onDidAddComment(addCallback)
        const invalidateCallback = jasmine.createSpy()
        reviewCommentPositioner.onDidInvalidateComment(invalidateCallback)

        editor.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)

        editor.getBuffer().insert([1, 1], 'a')
        expect(invalidateCallback.callCount).toBe(1)
        expect(invalidateCallback.argsForCall[0][0]).toBe(1)
      })
    })

    describe('when the marker is invalidated but the content in the row remains unchanged', () => {
      describe('when a new line is added at the end of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.getBuffer().insert([1, 3], '\n')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is removed at the end of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\ndef\n\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\n\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.getBuffer().delete([[1, 3], [2, 0]])
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is added at the beginning of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.getBuffer().insert([1, 0], '\n')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is removed at the beginning of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\n\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\n\ndef\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.getBuffer().delete([[1, 0], [2, 0]])
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when text is replaced by the same text', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.setTextInBufferRange([[1, 0], [1, 3]], 'def')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when leading whitespace is replaced with new line and whitespace', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\n  def\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\n  def\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n+  def'}))
          expect(addCallback.callCount).toBe(1)

          editor.setTextInBufferRange([[1, 0], [1, 3]], '  \n  def')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when highlighted text is deleted but row content is the same', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          editor.setText('abc\ndef\ndef')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\ndef', new Map().set(1, {row: 2, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          editor.setTextInBufferRange([[1, 1], [2, 1]], '')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })
    })
  })
})
