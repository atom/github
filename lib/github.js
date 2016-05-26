'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import etch from 'etch'

import GitHubAuth from './github-auth'
import GitHubModalSignInComponent from './components/github-modal-sign-in-component'
import GitHubModel from './github-model'
import PullRequestCommentManager from './pull-request-comment-manager'
import CommentEmitter from './comment-emitter'

etch.setScheduler(atom.views)

let GitHubStatusBarComponent

export default {
  gitHubStatusBarTile: null,
  modalPanel: null,
  subscriptions: null,
  auth: null,
  gitHubModel: null,
  pullRequestCommentManager: null,
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

  activate: function (state) {
    this.subscriptions = new CompositeDisposable()

    if (!this.auth) {
      this.auth = new GitHubAuth()
      this.subscriptions.add(new Disposable(() => this.auth.destroy()))
    }

    this.gitHubModel = new GitHubModel(this.auth)
    this.subscriptions.add(new Disposable(() => this.gitHubModel.destroy()))
    this.commentEmitter = new CommentEmitter()
    this.pullRequestCommentManager = new PullRequestCommentManager(this.gitHubModel, this.commentEmitter)
    this.subscriptions.add(new Disposable(() => this.pullRequestCommentManager.destroy()))

    // Register palette commands
    this.subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'github:sign-in',
        () => {
          const item = new GitHubModalSignInComponent({
            gitHubModel: this.gitHubModel,
            onClose: () => atom.workspace.panelForItem(item).destroy()
          })
          const panel = atom.workspace.addModalPanel({ item })
          const disposable = panel.onDidDestroy(() => {
            item.destroy()
            disposable.dispose()
          })
          this.subscriptions.add(disposable)
        }
      ),
      atom.commands.add(
        'atom-workspace',
        'github:sign-out',
        () => {
          // This will trigger an event that triggers the necessary UI updates.
          this.auth.deleteToken()
        }
      ),
      this.commentEmitter
    )
  },

  deactivate: function () {
    this.subscriptions.dispose()

    if (this.githubStatusBarComponent) {
      this.githubStatusBarComponent.destroy()
    }
    this.auth.destroy()
    this.auth = null
    this.pullRequestCommentManager.destroy()
  },

  provideGitHub: function () {
    return {
      getToken: () => {
        return this.auth.getToken()
      },

      onCommentAdded: (callback) => {
        return this.commentEmitter.onCommentAdded(callback)
      }
    }
  },

  consumeStatusBar: function (statusBar) {
    this.statusBar = statusBar
    this.showStatusBarItem()
  },

  showStatusBarItem: function () {
    if (!GitHubStatusBarComponent) {
      GitHubStatusBarComponent = require('./components/github-status-bar-component')
    }

    if (!this.statusBar) return

    if (this.gitHubStatusBarTileDisposable) {
      this.gitHubStatusBarTileDisposable.dispose()
    }
    const component = new GitHubStatusBarComponent({gitHubModel: this.gitHubModel, auth: this.auth})
    this.gitHubStatusBarTile = this.statusBar.addRightTile({
      item: component.element,
      priority: -255
    })
    this.gitHubStatusBarTileDisposable = new Disposable(() => {
      component.destroy()
      this.gitHubStatusBarTile.destroy()
    })
    this.subscriptions.add(this.gitHubStatusBarTileDisposable)
  }
}
