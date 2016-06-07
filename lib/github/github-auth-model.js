'use babel'

import {CompositeDisposable, Emitter} from 'atom'

// How often to re-check token validity if repo status 404s
const VALIDITY_CHECK_TIMEOUT = 1000 * 60 * 5

export default class GitHubAuthModel {
  constructor (gitHubAuth, gitHubModel) {
    this.auth = gitHubAuth
    this.gitHubModel = gitHubModel
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()

    this.subscriptions.add(
      this.auth.onDidDeleteToken(() => this.reset()),
      this.auth.onDidSetToken(() => this.checkAuthStatus()),
      this.gitHubModel.gitHubAPI.onDidFailAuthentication(() => this.authenticationFailed()),
      this.emitter
    )

    this.resetState()
    this.signedIn = !!(this.auth.getToken())
  }

  // Clear request cache and reset github metadata, if e.g. the user's token
  // becomes invalid.
  reset () {
    this.gitHubModel.gitHubAPI.clear()
    this.gitHubModel.gitHubAPI.resetAuthentication()
    this.resetState()
    this.didSignOut()
  }

  resetState () {
    this.signedIn = null
    this.validityCheckTimesByRepo = {}
    this.failedWithValidToken = false
  }

  // Sign out the user in the UI, notify them, and delete the token if their
  // creds go bad.
  authenticationFailed () {
    if (this.signedIn) {
      atom.notifications.addWarning("You've been signed out of GitHub", {dismissable: true})
      this.signedIn = false
    }
    return atom.commands.dispatch(atom.views.getView(atom.workspace), 'github:sign-out')
  }

  checkAuthStatus () {
    // Make sure that if we're forcing a check of general auth status, we are
    // also able to check repo access for a new valid token as well.
    this.validityCheckTimesByRepo = {}

    const tokenStatus = !!this.auth.getToken()
    if (this.signedIn !== tokenStatus) {
      // TODO: subscription method and consumers for this
      this.signedIn = tokenStatus
      if (tokenStatus) {
        this.didSignIn()
      } else {
        this.didSignOut()
      }
    }
    this.gitHubModel.gitHubAPI.resetAuthentication()
    this.signedIn = tokenStatus
    // TODO hit network and validate token?
  }

  isCurrentTokenValid () {
    return this.isTokenValid(this.auth.getToken())
  }

  /*
    Returns user if valid, false if not. Updates `validityCheckTimesByRepo`
  */
  async isTokenValid (token) {
    // check network status?
    const userResponse = await this.gitHubModel.gitHubAPI.request(
      '/user',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`
        }
      },
      true
    )
    this.validityCheckTimesByRepo[this.gitHubModel.gitHubRemote] = Date.now()
    if (userResponse && userResponse.data) {
      return userResponse.data
    } else {
      return false
    }
  }

  // Should we check this token for validity?
  shouldCheckToken (gitHubRemote) {
    if (!gitHubRemote || !this.signedIn) { return false }
    return (Date.now() - (this.validityCheckTimesByRepo[gitHubRemote] || 0)) > VALIDITY_CHECK_TIMEOUT
  }

  /*
    Public: Invoke the given callback when the GitHub authentication status changes to signed out.

    * `callback` A {Function} to be invoked when the status changes to signed out

    Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  */
  onDidSignOut (callback) {
    return this.emitter.on('did-sign-out', callback)
  }

  didSignOut () {
    this.emitter.emit('did-sign-out')
  }

  /*
    Public: Invoke the given callback when the GitHub authentication status changes to signed in.

    * `callback` A {Function} to be invoked when the status changes to signed in

    Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  */
  onDidSignIn (callback) {
    return this.emitter.on('did-sign-in', callback)
  }

  didSignIn () {
    this.emitter.emit('did-sign-in')
  }

  /*
    Public: Invoke the given callback if we have confirmed a valid token but
    have received a 404 checking for PR metadata.

    * `callback` A {Function} to be invoked when the status changes

    Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  */
  onDidFailFetchingWithValidToken (callback) {
    return this.emitter.on('did-fail-fetching-with-valid-token', callback)
  }

  didFailFetchingWithValidToken () {
    this.emitter.emit('did-fail-fetching-with-valid-token')
    this.gitHubModel.didChangeRepoMeta()
  }

  // Helper for catching 4xx when we want to recheck tokens. Maybe this should be
  // "always" and go into CachedRequest?

  async catchAndRecheckToken (error, gitHubRemote) {
    if (error.message.startsWith('HTTP 4') && this.shouldCheckToken(gitHubRemote)) {
      const isTokenValid = !!await this.isCurrentTokenValid()
      if (isTokenValid) {
        this.failedWithValidToken = true
        this.didFailFetchingWithValidToken()
      }
    }
  }

  destroy () {
    this.subscriptions.dispose()
  }
}
