'use babel'

import PullRequestCommentManager from '../lib/pull-request-comment-manager'
import EditorCommentRenderer from '../lib/editor-comment-renderer'

import path from 'path'

describe('PullRequestCommentManager', () => {
  let [prCommentManager, comments, filePath, absFilePath, wait] = []
  beforeEach(() => {
    wait = atom.config.get('github.maxCacheAge') || 1000 * 60

    comments = require('./fixtures/comments.json')
    filePath = 'file.txt'
    absFilePath = path.resolve(__dirname, 'fixtures', filePath)
    const gitHubModel = {
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
    prCommentManager = new PullRequestCommentManager(gitHubModel)
  })

  describe('::fetchComments', () => {
    it('gets called whenever there is a new active pane item', async () => {
      spyOn(prCommentManager, 'fetchComments')
      await openAndActivated(absFilePath)
      expect(prCommentManager.fetchComments.callCount).toBe(1)
      await openAndActivated(path.resolve(__dirname, 'fixtures', 'comments.json'))
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
      await openAndActivated(path.resolve(__dirname, 'fixtures', 'comments.json'))
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
      it('calls EditorCommentRenderer.renderCommentsForEditor(comments, editor) with the comments and editor', async () => {
        const editor = await openAndActivated(absFilePath)
        spyOn(EditorCommentRenderer, 'renderCommentsForEditor')
        await prCommentManager.fetchComments()
        await until(() => {
          return EditorCommentRenderer.renderCommentsForEditor.callCount
        })
        expect(EditorCommentRenderer.renderCommentsForEditor).toHaveBeenCalledWith(comments, editor)
      })
    })
  })

  describe('::destroyEditorCommentRenderer', () => {
    it('gets called whenever an editor is destroyed and is passed the closed editor', async () => {
      spyOn(prCommentManager, 'destroyEditorCommentRenderer')
      const editor = await openAndActivated(absFilePath)
      atom.workspace.getActivePane().destroyActiveItem()
      await until(() => prCommentManager.destroyEditorCommentRenderer.callCount)
      expect(prCommentManager.destroyEditorCommentRenderer).toHaveBeenCalledWith(editor)
      expect(atom.workspace.getActivePaneItem()).not.toBe(editor)
    })

    it('calls EditorCommentRenderer.destroyRendererForEditor(editor)', async () => {
      const editor = await openAndActivated(absFilePath)
      spyOn(EditorCommentRenderer, 'destroyRendererForEditor')
      atom.workspace.getActivePane().destroyActiveItem()
      await until(() => EditorCommentRenderer.destroyRendererForEditor.callCount)
      expect(EditorCommentRenderer.destroyRendererForEditor).toHaveBeenCalledWith(editor)
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
