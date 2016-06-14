'use babel'

import PrReviewCommentManager from '../../lib/github/review-comment/pr-review-comment-manager'
import EditorReviewCommentRenderer from '../../lib/github/review-comment/editor-review-comment-renderer'
import BufferReviewCommentPositioner from '../../lib/github/review-comment/buffer-review-comment-positioner'

import path from 'path'

describe('PrReviewCommentManager', () => {
  let [prCommentManager, comments, filePath, absFilePath, wait, gitHubModel] = []
  beforeEach(() => {
    wait = atom.config.get('github.maxCacheAge') || 1000 * 60

    comments = require('../fixtures/comments.json')
    filePath = 'file.txt'
    absFilePath = path.resolve(__dirname, '..', 'fixtures', filePath)
    gitHubModel = {
      async getBufferComments () {
        return comments
      },
      getPullRequestForCurrentBranch () {
        return { url: 'https://api.github.com/repos/BinaryMuse/test-repo/pulls/1' }
      },
      async getRepo () {
        return {
          async relativizeToWorkingDirectory () {
            return filePath
          }
        }
      }
    }
    prCommentManager = new PrReviewCommentManager(gitHubModel)
  })

  describe('::fetchComments', () => {
    it('gets called whenever there is a new active pane item', async () => {
      spyOn(prCommentManager, 'fetchComments')
      await openAndActivated(absFilePath)
      expect(prCommentManager.fetchComments.callCount).toBe(1)
      await openAndActivated(path.resolve(__dirname, '..', 'fixtures', 'comments.json'))
      expect(prCommentManager.fetchComments.callCount).toBe(2)
    })

    it('is called periodically after a certain wait time', async () => {
      spyOn(prCommentManager, 'fetchComments')
      await until(() => prCommentManager.fetching === false)
      expect(prCommentManager.fetchComments.callCount).toBe(0)

      advanceClock(wait)
      expect(prCommentManager.fetchComments.callCount).toBe(1)
      await oneTick()

      advanceClock(wait)
      expect(prCommentManager.fetchComments.callCount).toBe(2)
    })

    it('resets the timer when a new editor is activated', async () => {
      spyOn(prCommentManager, 'fetchComments')
      await openAndActivated(absFilePath)
      await until(() => prCommentManager.fetching === false)

      advanceClock(wait / 2)
      await openAndActivated(path.resolve(__dirname, '..', 'fixtures', 'comments.json'))
      expect(prCommentManager.fetchComments.callCount).toBe(2)

      advanceClock(wait - 1)
      expect(prCommentManager.fetchComments.callCount).toBe(2)
      advanceClock(1)
      expect(prCommentManager.fetchComments.callCount).toBe(3)
    })

    describe('when an editor for filepath is NOT in the foreground', () => {
      it('calls fileCommentManager::setComments(comments) with the appropriate comments', async () => {
        const fileCommentManager = prCommentManager.getFileCommentManager(filePath)
        spyOn(fileCommentManager, 'setComments')
        await prCommentManager.fetchComments()
        expect(fileCommentManager.setComments.argsForCall[0][0]).toEqual(comments)
      })

      it('passes suppress option = true if first load', async () => {
        prCommentManager.firstLoad = true
        const fileCommentManager = prCommentManager.getFileCommentManager(filePath)
        spyOn(fileCommentManager, 'setComments')
        await prCommentManager.fetchComments()
        expect(fileCommentManager.setComments.argsForCall[0][1]).toEqual({suppress: true})
        expect(prCommentManager.firstLoad).toBe(false)
      })
    })

    describe('when an editor for filepath IS in the foreground', () => {
      it('calls EditorReviewCommentRenderer.renderCommentsForEditor(comments, editor, positioner, gitHubModel) with the comments and editor', async () => {
        const editor = await openAndActivated(absFilePath)
        spyOn(EditorReviewCommentRenderer, 'renderCommentsForEditor')
        await prCommentManager.fetchComments()
        await until(() => {
          return EditorReviewCommentRenderer.renderCommentsForEditor.callCount
        })
        const positioner = BufferReviewCommentPositioner.getForBuffer(editor.getBuffer())
        expect(EditorReviewCommentRenderer.renderCommentsForEditor).toHaveBeenCalledWith(comments, editor, positioner, gitHubModel)
      })
    })
  })

  describe('::destroyEditorReviewCommentRenderer', () => {
    it('gets called whenever an editor is destroyed and is passed the closed editor', async () => {
      spyOn(prCommentManager, 'destroyEditorReviewCommentRenderer')
      const editor = await openAndActivated(absFilePath)
      atom.workspace.getActivePane().destroyActiveItem()
      await until(() => prCommentManager.destroyEditorReviewCommentRenderer.callCount)
      expect(prCommentManager.destroyEditorReviewCommentRenderer).toHaveBeenCalledWith(editor)
      expect(atom.workspace.getActivePaneItem()).not.toBe(editor)
    })

    it('calls EditorReviewCommentRenderer.destroyRendererForEditor(editor)', async () => {
      const editor = await openAndActivated(absFilePath)
      spyOn(EditorReviewCommentRenderer, 'destroyRendererForEditor')
      atom.workspace.getActivePane().destroyActiveItem()
      await until(() => EditorReviewCommentRenderer.destroyRendererForEditor.callCount)
      expect(EditorReviewCommentRenderer.destroyRendererForEditor).toHaveBeenCalledWith(editor)
    })
  })

  describe('::destroy', () => {
    it('stops periodically fetching comments', async () => {
      prCommentManager.nextFetch()
      spyOn(prCommentManager, 'fetchComments')
      prCommentManager.destroy()

      advanceClock(wait)
      expect(prCommentManager.fetchComments).not.toHaveBeenCalled()
    })
  })
})
