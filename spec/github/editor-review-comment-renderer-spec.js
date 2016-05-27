'use babel'

import path from 'path'
import fs from 'fs'

import EditorReviewCommentRenderer from '../../lib/github/review-comment/editor-review-comment-renderer'

function getBlockDecorations (editor) {
  return editor.getDecorations().filter(dec => dec.properties.type === 'block')
}

describe('EditorReviewCommentRenderer', () => {
  let [editor, renderer, comments, decorations] = []
  const commentsFilePath = path.resolve(__dirname, '..', 'fixtures', 'comments.json')
  const testFilePath = path.resolve(__dirname, '..', 'fixtures', 'file.txt')
  beforeEach(async () => {
    editor = await atom.workspace.open(testFilePath)
    renderer = new EditorReviewCommentRenderer(editor)
    comments = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'))
  })

  describe('::addComment(commentId, comment)', () => {
    it('renders comments', () => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment)
      })
      decorations = getBlockDecorations(editor)
      expect(decorations.length).toBe(2)
      expect(decorations[0].properties.item.innerText.includes(comments[0].body)).toBeTruthy()
      expect(decorations[1].properties.item.innerText.includes(comments[1].body)).toBeTruthy()
      expect(decorations[0].marker.getStartBufferPosition().row).toBe(comments[0].position - 1)
      expect(decorations[1].marker.getStartBufferPosition().row).toBe(comments[1].position - 1)
    })

    it('throws an error if comment already exists', () => {
      const comment = comments[0]
      renderer.addComment(comment.id, comment)
      expect(() => renderer.addComment(comment.id, comment)).toThrow()
    })
  })

  describe('modifying comments', () => {
    beforeEach(() => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment)
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
    it('calls ::addComment for new comments', () => {
      spyOn(renderer, 'addComment')
      renderer.renderComments(comments)
      expect(renderer.addComment).toHaveBeenCalledWith(comments[0].id, comments[0])
      expect(renderer.addComment).toHaveBeenCalledWith(comments[1].id, comments[1])
    })

    describe('when existing comments are changed', () => {
      beforeEach(() => {
        renderer.renderComments(comments)
      })

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
        renderer.addComment(comment.id, comment)
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
