'use babel'

import FileReviewCommentManager from '../../lib/github/review-comment/file-review-comment-manager'

describe('FileReviewCommentManager', () => {
  let [fileReviewCommentManager, comments, pack] = []
  beforeEach(async () => {
    pack = await atom.packages.activatePackage('github')

    fileReviewCommentManager = new FileReviewCommentManager('file.txt', pack.mainModule.github.commentEmitter)
    comments = require('../fixtures/comments.json')
    atom.config.set('github.showUnreadReviewCommentNotifications', true)
  })

  describe('::setComments(comments, {suppress})', () => {
    it('creates notifications for new comments', () => {
      spyOn(atom.notifications, 'addInfo')
      fileReviewCommentManager.setComments(comments)
      expect(atom.notifications.addInfo.callCount).toBe(2)
    })

    it('triggers new comment listeners on the main github module', async () => {
      const listener = jasmine.createSpy()
      pack.mainModule.provideGitHub().onCommentAdded(listener)
      fileReviewCommentManager.setComments(comments)
      await until(() => listener.callCount === 2)
    })

    it('does not create notifications if suppress option is true', () => {
      spyOn(atom.notifications, 'addInfo')
      fileReviewCommentManager.setComments(comments, {suppress: true})
      expect(atom.notifications.addInfo.callCount).toBe(0)
    })
  })

  describe('when github.showUnreadReviewCommentNotifications is false', () => {
    it('does not display notifications', () => {
      atom.config.set('github.showUnreadReviewCommentNotifications', false)
      spyOn(atom.notifications, 'addInfo')
      fileReviewCommentManager.setComments(comments)
      expect(atom.notifications.addInfo.callCount).toBe(0)
    })
  })
})
