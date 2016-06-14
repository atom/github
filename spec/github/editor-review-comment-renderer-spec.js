'use babel'

import path from 'path'
import fs from 'fs'

import {Range} from 'atom'

import EditorReviewCommentRenderer from '../../lib/github/review-comment/editor-review-comment-renderer'
import EditorReviewCommentPositioner from '../../lib/github/review-comment/editor-review-comment-positioner'

function getBlockDecorations (editor) {
  return editor.getDecorations().filter(dec => dec.properties.type === 'block')
}

describe('EditorReviewCommentRenderer', () => {
  let [editor, renderer, comments, decorations, positioner, gitHubModel] = []
  const commentsFilePath = path.resolve(__dirname, '..', 'fixtures', 'comments.json')
  const testFilePath = path.resolve(__dirname, '..', 'fixtures', 'file.txt')
  beforeEach(async () => {
    editor = await atom.workspace.open(testFilePath)
    positioner = EditorReviewCommentPositioner.getForEditor(editor)
    gitHubModel = {
      async getDiff () {
        return 'a string here'
      }
    }
    renderer = new EditorReviewCommentRenderer(editor, positioner, gitHubModel)
    comments = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'))
  })

  const range = new Range([3, 0], [3, 3])
  describe('::addComment(commentId, comment)', () => {
    it('renders comments', () => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment, range)
      })
      decorations = getBlockDecorations(editor)
      expect(decorations.length).toBe(2)
      expect(decorations[0].properties.item.innerText.includes(comments[0].body)).toBeTruthy()
      expect(decorations[1].properties.item.innerText.includes(comments[1].body)).toBeTruthy()
    })

    it('throws an error if comment already exists', () => {
      const comment = comments[0]
      renderer.addComment(comment.id, comment, range)
      expect(() => renderer.addComment(comment.id, comment)).toThrow()
    })
  })

  describe('modifying comments', () => {
    beforeEach(() => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment, range)
      })
      decorations = getBlockDecorations(editor)
    })

    describe('::updateComment(commentId, comment)', () => {
      it('updates any already rendered comments', async () => {
        const updatedComment = comments[0]
        updatedComment.body = 'updated text'
        await renderer.updateComment(updatedComment.id, updatedComment)
        const updatedDecorations = getBlockDecorations(editor)
        expect(updatedDecorations[0].properties.item.innerText.includes('updated text')).toBeTruthy()
      })
    })

    describe('::destroyComment(commentId, comment)', () => {
      it('deletes any removed comments', () => {
        const removedComment = comments[0]
        renderer.destroyComment(removedComment.id)
        const updatedDecorations = getBlockDecorations(editor)
        expect(updatedDecorations.length).toBe(1)
        expect(updatedDecorations.includes(decorations[0])).toBeFalsy()
      })
    })
  })

  describe('::renderComments', () => {
    beforeEach(() => {
      spyOn(renderer, 'addComments')
      renderer.renderComments(comments)
    })

    it('calls ::addComments for new comments', () => {
      renderer.addComments.reset()
      comments.push({
        id: 1337,
        stuff: 'things'
      })
      renderer.renderComments(comments)
      expect(renderer.addComments.argsForCall[0][0]).toEqual(new Set([1337]))
    })

    describe('when existing comments are changed', () => {
      it('calls ::updateComment for modified comments', () => {
        spyOn(renderer, 'updateComment')
        const updatedComment = comments[0]
        updatedComment.body = 'updated text'
        renderer.renderComments([updatedComment])
        expect(renderer.updateComment).toHaveBeenCalledWith(updatedComment.id, updatedComment)
      })

      it('calls ::destroyComment for removed comments', () => {
        spyOn(renderer, 'destroyComment')
        const removedComment = comments.pop()
        renderer.renderComments(comments)
        expect(renderer.destroyComment).toHaveBeenCalledWith(removedComment.id)
      })
    })
  })

  describe('::destroy', () => {
    beforeEach(() => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment, range)
      })
      decorations = getBlockDecorations(editor)
    })

    it('removes all rendered comments', () => {
      expect(decorations.length).toBe(2)
      renderer.destroy()
      const remainingDecorations = getBlockDecorations(editor)
      expect(remainingDecorations.length).toBe(0)
    })
  })
})
