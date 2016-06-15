'use babel'

import CachedRequest from '../cached-request'
import GitHubAuthModel from '../github-auth-model'
import GitHubPullRequestModel from '../github-pull-request-model'

import {Emitter} from 'atom'

export default class GitHubModel {
  constructor (gitHubAuth) {
    this.gitHubAPI = new CachedRequest()
    this.authModel = new GitHubAuthModel(gitHubAuth, this)
    this.pullRequestModel = new GitHubPullRequestModel(this)

    this.emitter = new Emitter()

    this.resetState()
  }

  resetState () {
    this.gitHubRemote = null
    this.currentBranch = null
    this.combinedStatuses = {}
    this.authModel.resetState()
    this.pullRequestModel.resetState()
  }

  onDidChangeRepoMeta (callback) {
    return this.emitter.on('did-change-repo-meta', callback)
  }

  didChangeRepoMeta (repoMeta) {
    this.emitter.emit('did-change-repo-meta', repoMeta)
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

  async getRepoMeta () {
    // TODO: One of these two functions cound use a rename
    const {gitHubRemote, currentBranch} = await this.getLocalRepoMetadata()

    if (gitHubRemote) {
      try {
        await this.pullRequestModel.fetchPullRequests()
      } catch (error) {
        await this.authModel.catchAndRecheckToken(error, gitHubRemote)
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
    this.pullRequestModel.getPullRequestForCurrentBranch()
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

  destroy () {
    this.emitter.dispose()
    this.authModel.destroy()
  }
}
