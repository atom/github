'use babel'

import CachedRequest from '../cached-request'

import {CompositeDisposable, Emitter} from 'atom'

// How often to re-check token validity if repo status 404s
const VALIDITY_CHECK_TIMEOUT = 1000 * 60 * 5

export default class GitHubModel {
  constructor (gitHubAuth) {
    this.auth = gitHubAuth
    this.subscriptions = new CompositeDisposable()
    this.gitHubAPI = new CachedRequest()
    this.emitter = new Emitter()
    this.subscriptions.add(
      this.auth.onDidDeleteToken(() => this.reset()),
      this.auth.onDidSetToken(() => this.checkAuthStatus()),
      this.gitHubAPI.onDidFailAuthentication(() => this.authenticationFailed()),
      this.emitter
    )

    this.resetState()
    this.signedIn = !!(this.auth.getToken())
  }

  // Clear request cache and reset github metadata, if e.g. the user's token
  // becomes invalid.
  reset () {
    this.gitHubAPI.clear()
    this.gitHubAPI.resetAuthentication()
    this.resetState()
    this.didSignOut()
  }

  resetState () {
    this.signedIn = null
    this.gitHubRemote = null
    this.currentBranch = null
    this.currentPullRequest = null
    this.pullRequests = {}
    this.combinedStatuses = {}
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
    this.gitHubAPI.resetAuthentication()
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
    const userResponse = await this.gitHubAPI.request(
      '/user',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`
        }
      },
      true
    )
    this.validityCheckTimesByRepo[this.gitHubRemote] = Date.now()
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
    Public: invoke the given callback when the current remote & branch change
  */

  onDidChangeRepoMeta (callback) {
    return this.emitter.on('did-change-repo-meta', callback)
  }

  didChangeRepoMeta (repoMeta) {
    this.emitter.emit('did-change-repo-meta', repoMeta)
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
    this.didChangeRepoMeta()
  }

  getActiveItemPath () {
    const activeItem = atom.workspace.getActivePaneItem()
    if (!activeItem) { return }
    if (!activeItem.getPath) { return }
    return activeItem.getPath()
  }

  githubNWOFromRemote (remoteURL) {
    if (remoteURL.match(/(git@|https:\/\/)github\.com/)) {
      const trimmedURL = remoteURL.replace(/\.git$/, '')
      const matches = trimmedURL.match(/([\w-\._]+\/[\w-\._]+)$/)
      return matches[1]
    } else {
      return
    }
  }

  getRepo () {
    const activeItemPath = this.getActiveItemPath()
    // If nothing is open, we won't have an active item path, and we can return
    // the first project repository - which is null if there are none.
    if (!activeItemPath) {
      const firstRepo = atom.project.getRepositories()[0]
      return firstRepo ? firstRepo.async : null
    }

    const [rootDirectory] = atom.project.relativizePath(activeItemPath)
    const directoryIndex = atom.project.getPaths().indexOf(rootDirectory)
    if (directoryIndex >= 0) {
      const repo = atom.project.getRepositories()[directoryIndex]
      if (repo) {
        return repo.async
      } else {
        return
      }
    } else {
      for (let repo of atom.project.getRepositories()) {
        if (repo) {
          return repo.async
        }
      }
    }
  }

  async getBranch () {
    const itemPath = this.getActiveItemPath()
    const repo = this.getRepo()
    if (!repo) { return }
    this.currentBranch = await repo.getShortHead(itemPath)
    return this.currentBranch
  }

  async githubNWO () {
    const repo = this.getRepo()
    if (!repo) { return }
    return this.githubNWOFromRemote(await repo.getOriginURL())
  }

  async getLocalRepoMetadata () {
    this.currentBranch = await this.getBranch()
    this.gitHubRemote = await this.githubNWO()
    return {currentBranch: this.currentBranch, gitHubRemote: this.gitHubRemote}
  }

  getPullRequestForCurrentBranch () {
    if (this.currentBranch) {
      this.currentPullRequest = this.cachedPullRequestForBranch(this.currentBranch)
    } else {
      this.currentPullRequest = null
    }
    return this.currentPullRequest
  }

  // Right now this just does some simple matching that mostly just works
  // reliably for PRs that are branches on origin, not forks. It needs to be
  // made much more sophisticated, fortunately we get all kinds of great info
  // from the GitHub API about PRs that we can use to compare.
  cachedPullRequestForBranch (branchName) {
    const filter = (item) => {
      if (item && item.head && item.head.repo && this.gitHubRemote) {
        if (item.head.repo.full_name.toLowerCase() === this.gitHubRemote.toLowerCase()) {
          return item.head.ref === this.currentBranch
        }
      } else {
        return null
      }
    }
    return (this.pullRequests[this.gitHubRemote] || []).find(filter)
  }

  get buildStatus () {
    let status = this.combinedStatus(this.gitHubRemote, this.currentBranch)
    if (this.currentBranch === 'master' || status.statuses.length === 0) {
      return null
    } else {
      return status.state
    }
  }

  combinedStatus (repo, ref) {
    if (this.combinedStatuses[repo] && this.combinedStatuses[repo][ref]) {
      return this.combinedStatuses[repo][ref]
    } else {
      return {status: 'pending', statuses: []}
    }
  }

  addCombinedStatus (repo, ref, status) {
    if (!this.combinedStatuses[repo]) {
      this.combinedStatuses[repo] = {}
    }
    this.combinedStatuses[repo][ref] = status
    return status
  }

  // This function would benefit from GraphQL.
  async fetchPullRequests () {
    await this.getLocalRepoMetadata()
    let pulls = []
    let parentPulls = []

    try {
      // fetch pull requests for this repo
      pulls = await this.gitHubAPI.paginatedRequest(`/repos/${this.gitHubRemote}/pulls`)
    } catch (error) {
      console.error('Error fetching pull requests from GitHub', error)
    }

    // Is this repo a fork? If so, make some more HTTP requests. Throw if we 404
    // so we can do a token check up the chain as necessary
    const repoResponse = await this.gitHubAPI.request(`/repos/${this.gitHubRemote}`, {}, {shouldThrow: true})

    try {
      const repo = repoResponse ? repoResponse.data : {}
      if (repo.parent) {
        parentPulls = await this.gitHubAPI.paginatedRequest(`/repos/${repo.parent.full_name}/pulls`)
      }
      this.pullRequests[this.gitHubRemote] = pulls.concat(parentPulls)

      this.getPullRequestForCurrentBranch()
    } catch (error) {
      console.error('Error fetching fork parent pull requests from GitHub', error)
    }
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

  // When we change a pane, make sure we are using the right repository, branch,
  // pull, etc

  async getRepoMeta () {
    // TODO: One of these two functions cound use a rename
    const {gitHubRemote, currentBranch} = await this.getLocalRepoMetadata()

    if (gitHubRemote) {
      try {
        await this.fetchPullRequests()
      } catch (error) {
        await this.catchAndRecheckToken(error, gitHubRemote)
      }

      try {
        const response = await this.requestBuildStatusForRemoteAndBranch(gitHubRemote, currentBranch)
        if (response) {
          this.addCombinedStatus(gitHubRemote, currentBranch, response.data)
          if (response.data && response.data.state === 'pending') {
            /*
            We're just going to redo all the requests in 31 seconds, the PR
            reqs are very likely to come out of the cache (10 minute max age)
            but if the current status is pending (which it is, because we are
            inside this if clause) the status reqs will hit the network.
            */
            this.refetchMetaWithTimeout(1000 * 31)
          }
        }
      } catch (error) {
        console.error('Error fetching combined repo status from GitHub', error)
      }
    }

    this.setRepoMeta({currentBranch: currentBranch, gitHubRemote: gitHubRemote})
    return {currentBranch: currentBranch, gitHubRemote: gitHubRemote}
  }

  setRepoMeta ({currentBranch, gitHubRemote}) {
    this.currentBranch = currentBranch
    this.gitHubRemote = gitHubRemote
    this.getPullRequestForCurrentBranch()
    this.didChangeRepoMeta({currentBranch: currentBranch, gitHubRemote: gitHubRemote})
  }

  refetchMetaWithTimeout (timeout = 0) {
    window.setTimeout(() => {
      this.getRepoMeta()
    }, timeout)
  }

  // Build statuses
  async requestBuildStatusForRemoteAndBranch (gitHubRemote, currentBranch) {
    // Fetch new status from cache no more than every 3 minutes...
    let maxAge = 1000 * 60 * 3
    // ...unless it's currently pending, in which case...
    if (this.currentStatus && this.currentStatus.state === 'pending') {
      // ...30 seconds seems good.
      maxAge = 1000 * 30
      /*
      But this doesn't actually trigger a 30 second update, just makes sure
      get fresh updates on this one. If we want to update the status icon
      more often than on active item change, we have to set a timer which we will
      do below, if the new status is still pending.
      */
    }

    return await this.gitHubAPI.request(
      `/repos/${gitHubRemote}/commits/${currentBranch}/status`,
      {},
      {maxAge: maxAge}
    )
  }

  /*
    Pull Request Review Comments
    ============================
  */

  async getBufferComments () {
    try {
      await this.fetchPullRequests()
      if (!this.currentPullRequest || !this.gitHubRemote) { // helperize
        return []
      }
      // we shouldn't be building these paths ourselves
      return await this.gitHubAPI.paginatedRequest(
        `/repos/${this.currentPullRequest.base.repo.full_name}/pulls/${this.currentPullRequest.number}/comments`
      )
    } catch (e) {
      this.catchAndRecheckToken(e, this.gitHubRemote)
      return []
    }
  }

  async getDiff (commitId) {
    return await this.gitHubAPI.requestDiff(
      'https://api.github.com/repos/BinaryMuse/test-repo/compare/master...cafc2213a1a1098d6adbb077c4ec267505286672'
    )
  }

  destroy () {
    this.subscriptions.dispose()
  }
}
