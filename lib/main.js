'use babel'

import git from './git/git-main'
import github from './github/github-main'

export default {
  config: {
    authorizationURL: {
      title: 'Authorization URL',
      type: 'string',
      default: 'https://github-atom-sign-in.herokuapp.com/'
    },
    showUnreadReviewCommentNotifications: {
      type: 'boolean',
      default: true,
      order: 1
    },
    notificationDuration: {
      type: 'number',
      default: 10000,
      order: 2
    }
  },

  activate (state) {
    git.activate(state)
    github.activate(state)
    git.consumeGitHub(github.provideGitHub())

    this.git = git
    this.github = github
  },

  consumeStatusBar (statusBar) {
    git.consumeStatusBar(statusBar)
    github.consumeStatusBar(statusBar)
  },

  provideGitHub () {
    return github.provideGitHub()
  },

  provideGitPush () {
    return git.provideGitPush()
  },

  serialize () {
    return git.serialize()
  },

  deactivate () {
    git.deactivate()
    github.deactivate()
  }
}
