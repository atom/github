'use babel'

import FileCommentManager from '../lib/file-comment-manager'

describe('FileCommentManager', () => {
  let [fileCommentManager, comments, pack] = []
  beforeEach(async () => {
    pack = await atom.packages.activatePackage('github')

    fileCommentManager = new FileCommentManager('file.txt', pack.mainModule.commentEmitter)
    comments = require('./fixtures/comments.json')
    atom.config.set('github.showUnreadReviewCommentNotifications', true)
  })

  describe('::setComments(comments, {suppress})', () => {
    it('creates notifications for new comments', () => {
      spyOn(atom.notifications, 'addInfo')
      fileCommentManager.setComments(comments)
      expect(atom.notifications.addInfo.callCount).toBe(2)
    })

    it('triggers new comment listeners on the main github module', async () => {
      const listener = jasmine.createSpy()
      pack.mainModule.provideGitHub().onCommentAdded(listener)
      fileCommentManager.setComments(comments)
      await until(() => listener.callCount === 2)
    })

    it('does not create notifications if suppress option is true', () => {
      spyOn(atom.notifications, 'addInfo')
      fileCommentManager.setComments(comments, {suppress: true})
      expect(atom.notifications.addInfo.callCount).toBe(0)
    })
  })

  describe('when github.showUnreadReviewCommentNotifications is false', () => {
    it('does not display notifications', () => {
      atom.config.set('github.showUnreadReviewCommentNotifications', false)
      spyOn(atom.notifications, 'addInfo')
      fileCommentManager.setComments(comments)
      expect(atom.notifications.addInfo.callCount).toBe(0)
    })
  })
})
