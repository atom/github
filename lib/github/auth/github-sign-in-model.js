'use babel'

/*
State and helper methods for the modal sign in panel that is shown when github
sign in is triggered.
*/

import {CompositeDisposable, Emitter} from 'atom'

export default class GitHubSignInModel {
  constructor (gitHubModel) {
    this.gitHubModel = gitHubModel
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()
    return this
  }

  // proxies to GitHubModel

  get github () {
    return this.gitHubModel.gitHubAPI
  }

  onDidSetToken (cb) {
    return this.gitHubModel.auth.onDidSetToken(cb)
  }

  setToken (token) {
    return this.gitHubModel.auth.setToken(token)
  }

  onDidFailTokenCheck (cb) {
    return this.emitter.on('did-fail-token-check', cb)
  }

  onDidSucceedTokenCheck (cb) {
    return this.emitter.on('did-succeed-token-check', cb)
  }

  // Public: hits the network to check whether the user's GitHub token is still
  // valid.
  checkToken (token) {
    return this.gitHubModel.isTokenValid(token).then((user) => {
      if (user) {
        this.setToken(token)
        this.didSucceedTokenCheck(user)
        this.gitHubModel.checkAuthStatus()
      } else {
        this.didFailTokenCheck((user && user.response) ? user.response.status : null)
      }
      return user
    })
  }

  didSucceedTokenCheck (user) {
    return this.emitter.emit('did-succeed-token-check', user)
  }

  didFailTokenCheck (statusCode) {
    return this.emitter.emit('did-fail-token-check', statusCode)
  }

  destroy () {
    this.subscriptions.dispose()
  }
}
