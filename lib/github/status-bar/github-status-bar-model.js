'use babel'

import path from 'path'

import {BufferedProcess, CompositeDisposable, Disposable, Emitter} from 'atom'

export default class GitHubStatusBarModel {
  constructor () {
    this.syncStatus = {
      needsPush: false,
      needsPull: false,
      needsSync: false
    }
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()
    this.repoSubscriptions = null
    this.combinedStatuses = {}
  }

  destroy () {
    this.emitter.dispose()
    this.subscriptions.dispose()
  }

  initialize (gitHubModel) {
    // This is gross but custom element constructors not acceping params lead to
    // initialize chains
    this.gitHubModel = gitHubModel

    if (!this.gitHubModel) {
      console.warn('Creating new GitHubModel instance in GitHubStatusBarModel. If this happens outside of tests, be concerned.')
      const GitHubModel = require('./github-model')
      this.gitHubModel = new GitHubModel()
      this.subscriptions.add(new Disposable(() => this.gitHubModel.destroy()))
    }

    this.subscriptions.add(
      atom.workspace.observeActivePaneItem(() => this.setInitialState()),
      this.gitHubModel.onDidSignIn(() => this.setSuccessOnTimeout()),
      this.gitHubModel.onDidSignOut(() => this.shouldUpdateComponent()),
      this.gitHubModel.onDidChangeRepoMeta(() => this.shouldUpdateComponent()),
      this.gitHubModel.onDidFailFetchingWithValidToken(() => {
        // TODO: display something?
      })
    )

    return this
  }

  get renderState () {
    // This is a pretty awkward tree of conditionals
    // https://twitter.com/keith_duncan/status/638582305917833217
    if (this.animatingSuccess) {
      return 'SIGN_IN_SUCCESS'
    } else if (this.signedIn && this.noRepoAccess) {
      return 'NO_REPO_ACCESS'
    } else if (this.signedIn) {
      if (this.pushing) {
        return 'PUSHING'
      } else {
        if (this.currentPullRequest) {
          return 'PR'
        } else {
          return 'NO_PR'
        }
      }
    } else {
      return 'SIGNED_OUT'
    }
  }

  /* Getters
     =======

     Proxies to attributes on gitHubModel that still should be directly available
     to the StatusBarItem view.
  */

  get github () {
    return this.gitHubModel.gitHubAPI
  }

  get currentPullRequest () {
    return this.gitHubModel.currentPullRequest
  }

  get buildStatus () {
    return this.gitHubModel.buildStatus
  }

  get currentBranch () {
    return this.gitHubModel.currentBranch
  }

  get signedIn () {
    return this.gitHubModel.signedIn
  }

  get noRepoAccess () {
    return this.gitHubModel.failedWithValidToken
  }

  get gitHubRemote () {
    return this.gitHubModel.gitHubRemote
  }

  get githubCompareURL () {
    if (!this.gitHubModel.gitHubRemote || !this.gitHubModel.currentBranch) {
      return
    } else {
      return `https://github.com/${this.gitHubModel.gitHubRemote}/pull/new/${this.gitHubModel.currentBranch}`
    }
  }

  setSuccessOnTimeout () {
    this.animatingSuccess = true
    this.shouldUpdateComponent()
    setTimeout(() => {
      this.animatingSuccess = false
      this.shouldUpdateComponent()
    }, 3000)
  }

  setInitialState () {
    // This is probably wasteful, we can keep track of the current repo and only
    // create new subscriptions if it has changed.
    this.updateRepoSubscriptions()

    this.gitHubModel.getRepoMeta()
    this.setSyncStatus() // calls shouldUpdateComponent
  }

  updateRepoSubscriptions () {
    // TODO: fix this to handle multiple repos
    if (this.repoSubscriptions) {
      this.repoSubscriptions.dispose()
      this.repoSubscriptions = null
    }

    const repo = this.gitHubModel.getRepo()
    if (repo) {
      this.repoSubscriptions = new CompositeDisposable()
      this.repoSubscriptions.add(repo.onDidChangeStatuses(() => {
        this.setInitialState()
      }))
      this.subscriptions.add(this.repoSubscriptions)
    }
  }

  /*
  This is temporary, it uses Nodegit directly, but before this gets any serious
  feature work, remote operations should be exposed in the core GitRepositoryAsync
  class.
  */
  async push () {
    const asyncRepo = await this.gitHubModel.getRepo()
    const repo = await asyncRepo.repoPromise
    // These are also only temporary.
    if (!asyncRepo || !repo) { throw new Error('No repository') }
    if (!this.gitHubModel.currentBranch) { throw new Error('No current branch') }
    // XXX: This depends on you having a reasonably working git configuration! :finnadie:
    return await new Promise((resolve, reject) => {
      let mergedOutput = ''
      const stdout = (out) => {
        console.log(out)
        mergedOutput += out
      }
      const stderr = (out) => {
        console.log(out)
        mergedOutput += out
      }
      const exit = (code) => {
        console.log(`git exited with ${code}`)
        if (code > 0) {
          reject(`${code} - ${mergedOutput}`)
        } else {
          resolve(code)
        }
      }

      return new BufferedProcess({
        command: 'git',
        args: ['push', 'origin', this.gitHubModel.currentBranch],
        stdout: stdout,
        stderr: stderr,
        exit: exit,
        options: {
          cwd: path.dirname(asyncRepo.openedPath)
        }
      })
    })
  }

  isPREnabled () {
    // TODO
  }

  async expirePRCache () {
    if (!this.gitHubModel.gitHubRemote) {
      return Promise.resolve(null)
    } else {
      return this.github.expirePath(`/repos/${this.gitHubModel.gitHubRemote}/pulls`)
    }
  }

  resetSyncStatus () {
    this.syncStatus = {
      needsPush: false,
      needsPull: false,
      needsSync: false
    }
    this.shouldUpdateComponent()
  }

  // Determine if we need to push
  async setSyncStatus () {
    const repo = this.gitHubModel.getRepo()
    if (!repo) { return }
    const ab = await repo.getCachedUpstreamAheadBehindCount(this.gitHubModel.getActiveItemPath())
    let upstreamBranch
    try {
      upstreamBranch = await repo.getUpstreamBranch(this.gitHubModel.getActiveItemPath())
      upstreamBranch = upstreamBranch.toString() // bug in GRA?
    } catch (error) {
      console.error('Error getting upstream branch, maybe a bug in GitRepositoryAsync?', error)
    }
    this.resetSyncStatus()
    this.syncStatus.aheadBehind = ab

    if (ab.behind === 0) {
      if (ab.ahead > 0) {
        this.syncStatus.needsPush = true
      }
    } else {
      if (ab.ahead > 0) {
        this.syncStatus.needsSync = true
      } else {
        this.syncStatus.needsPull = true
      }
    }

    if (!upstreamBranch) {
      this.syncStatus.needsPush = true
    }

    this.emitter.emit('did-set-sync-status')
    this.shouldUpdateComponent()
  }

  shouldShowMeta () {
    const should = !!(this.gitHubModel.gitHubRemote && this.gitHubModel.signedIn)
    return should
  }

  /*
  Event subscription
  ==================
  */

  // The other event subscription methods might just go away, adding
  // this to simplify the move to an etch component. Returns a {Disposable}
  onShouldUpdateComponent (callback) {
    return this.emitter.on('should-update-component', callback)
  }

  shouldUpdateComponent () {
    this.emitter.emit('should-update-component')
  }

  onDidChangeRepoMeta (callback) {
    return this.gitHubModel.onDidChangeRepoMeta(callback)
  }

  onDidSetSyncStatus (callback) {
    return this.emitter.on('did-set-sync-status', callback)
  }
}
