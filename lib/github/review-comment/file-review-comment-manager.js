'use babel'

import compareSets from 'compare-sets'

export default class FileReviewCommentManager {
  constructor (path, commentEmitter) {
    this.lastReceivedCommentsById = new Map()
    this.commentEmitter = commentEmitter
    this.path = path
  }

  setComments (comments, options = {}) {
    const commentsById = new Map(comments.map(comment => [comment.id, comment]))
    const {added} = this.calculateChangeSets(commentsById)
    if (atom.config.get('github.showUnreadReviewCommentNotifications')) {
      if (!options.suppress) { added.forEach(commentId => this.notify(commentsById.get(commentId))) }
    }
    this.lastReceivedCommentsById = commentsById
  }

  calculateChangeSets (commentsById) {
    const newCommentIds = new Set(commentsById.keys())
    const current = new Set(this.lastReceivedCommentsById.keys())
    return compareSets(current, newCommentIds)
  }

  notify (comment) {
    const message = `New review comment from ![avatar](${comment.user.avatar_url}&s=25) **${comment.user.login}** <br>in *${this.path}*`
    const detail = comment.body
    const notification = atom.notifications.addInfo(message, {detail, icon: 'comment-discussion', dismissable: true})
    this.commentEmitter.didAddComment(comment)

    setTimeout(() => {
      notification.dismiss()
    }, atom.config.get('github.notificationDuration'))
  }
}
