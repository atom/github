'use babel'

import path from 'path'
import fs from 'fs'

import EditorReviewCommentRenderer from '../../lib/github/review-comment/editor-review-comment-renderer'
import EditorReviewCommentPositioner from '../../lib/github/review-comment/editor-review-comment-positioner'

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

  describe('::addComment(commentId, comment, marker)', () => {
    it('renders comments', () => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment, editor.markBufferRange([[3, 0], [3, 3]]))
      })
      decorations = editor.getDecorations({type: 'block'})
      expect(decorations.length).toBe(2)
      expect(decorations[0].properties.item.innerText.includes(comments[0].body)).toBeTruthy()
      expect(decorations[1].properties.item.innerText.includes(comments[1].body)).toBeTruthy()
    })

    it('throws an error if comment already exists', () => {
      const comment = comments[0]
      renderer.addComment(comment.id, comment, editor.markBufferRange([[3, 0], [3, 3]]))
      expect(() => renderer.addComment(comment.id, comment)).toThrow()
    })
  })

  describe('modifying comments', () => {
    beforeEach(() => {
      comments.forEach(comment => {
        renderer.addComment(comment.id, comment, editor.markBufferRange([[3, 0], [3, 3]]))
      })
      decorations = editor.getDecorations({type: 'block'})
    })

    describe('::updateComment(commentId, comment)', () => {
      it('updates any already rendered comments', async () => {
        const updatedComment = comments[0]
        updatedComment.body = 'updated text'
        await renderer.updateComment(updatedComment.id, updatedComment)
        const updatedDecorations = editor.getDecorations({type: 'block'})
        expect(updatedDecorations[0].properties.item.innerText.includes('updated text')).toBeTruthy()
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
})
