'use babel'

import BufferReviewCommentPositioner from '../../lib/github/review-comment/buffer-review-comment-positioner'
import {Range, Point} from 'atom'

describe('BufferReviewCommentPositioner', () => {
  let editor, buffer, reviewCommentPositioner, addCallback, invalidateCallback

  beforeEach(() => {
    editor = atom.workspace.buildTextEditor()
    buffer = editor.getBuffer()
    reviewCommentPositioner = new BufferReviewCommentPositioner(buffer)
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
        buffer.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].range.start).toEqual({ row: 1, column: 0 })
        expect(addCallback.argsForCall[0][0].range.end).toEqual({ row: 1, column: 3 })
      })
    })

    describe('when the buffer contents differ from comment\'s original commit', () => {
      it('calls onDidAddComment listener with translated row', () => {
        buffer.setText('def\nghi\nABC\nDEF\nlmn\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].range.start).toEqual({ row: 4, column: 0 })
        expect(addCallback.argsForCall[0][0].range.end).toEqual({ row: 4, column: 3 })
      })
    })

    describe('when the buffer contents no longer has content comment refers to', () => {
      it('doesn\'t call onDidAddComment listener', () => {
        buffer.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(0)
      })
    })

    describe('when the comment becomes valid again after `refreshOutdated()`', () => {
      it('calls onDidAddComment listener with the correct row', () => {
        buffer.setText('def\nABC\nDEF\nghi\nGHI\nJKL\nMNO\nopq\nrst')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi\nlmn\nopq\nrst', new Map().set(1, {row: 3, diff_hunk: '+abc\n+def\n+ghi\n+lmn'}))
        expect(addCallback.callCount).toBe(0)

        buffer.insert([7, 0], 'lmn\n')
        reviewCommentPositioner.refreshOutdated()
        expect(addCallback.callCount).toBe(1)
        expect(addCallback.argsForCall[0][0].range.start).toEqual({ row: 7, column: 0 })
        expect(addCallback.argsForCall[0][0].range.end).toEqual({ row: 7, column: 3 })
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

        buffer.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)

        buffer.deleteRow(1)
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

        buffer.setText('abc\ndef\nghi')
        reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
        expect(addCallback.callCount).toBe(1)

        buffer.insert(new Point(1, 1), 'a')
        expect(invalidateCallback.callCount).toBe(1)
        expect(invalidateCallback.argsForCall[0][0]).toBe(1)
      })
    })

    describe('when the marker is invalidated but the content in the row remains unchanged', () => {
      describe('when a new line is added at the end of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.insert(new Point(1, 3), '\n')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is removed at the end of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\ndef\n\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\n\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.delete(new Range([1, 3], [2, 0]))
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is added at the beginning of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 1, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.insert(new Point(1, 0), '\n')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when a new line is removed at the beginning of the row', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\n\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\n\ndef\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.delete(new Range([1, 0], [2, 0]))
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when text is replaced by the same text', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\ndef\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.setTextInRange(new Range([1, 0], [1, 3]), 'def')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when leading whitespace is replaced with new line and whitespace', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\n  def\nghi')
          reviewCommentPositioner.add('commit_id', 'abc\n  def\nghi', new Map().set(1, {row: 2, diff_hunk: '+abc\n+  def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.setTextInRange(new Range([1, 0], [1, 3]), '  \n  def')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })

      describe('when highlighted text is deleted but row content is the same', () => {
        it('does not call the ::onDidInvalidateComment callback and updates the marker range', () => {
          buffer.setText('abc\ndef\ndef')
          reviewCommentPositioner.add('commit_id', 'abc\ndef\ndef', new Map().set(1, {row: 2, diff_hunk: '+abc\n+def'}))
          expect(addCallback.callCount).toBe(1)

          buffer.setTextInRange(new Range([1, 1], [2, 1]), '')
          expect(invalidateCallback.callCount).toBe(0)
        })
      })
    })
  })
})
