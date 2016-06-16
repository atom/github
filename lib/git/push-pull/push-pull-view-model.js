/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import GitStore from '../git-store'
import GitService from '../git-service'

import type {GitHubService} from '../../github/github-service'
import type {Disposable} from 'atom' // eslint-disable-line no-duplicate-imports

export default class PushPullViewModel {
  gitStore: GitStore;
  gitService: GitService;
  gitHubService: GitHubService;
  token: ?string;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  inFlightRequests: number;
  oldInFlightRequests: number;

  progress: number;
  oldProgress: number;

  behindCount: number;
  oldBehindCount: number;

  aheadCount: number;
  oldAheadCount: number;

  intervalId: number;

  constructor (gitStore: GitStore, gitHubService: GitHubService) {
    this.inFlightRequests = 0
    this.aheadCount = 0
    this.behindCount = 0
    this.intervalId = -1

    this.gitStore = gitStore
    this.gitService = gitStore.getGitService()
    this.setGitHubService(gitHubService)

    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:fetch', () => this.fetch()))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:pull', () => this.pull()))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:push', () => this.push()))

    this.subscriptions.add(this.gitStore.onDidChange(info => {
      this.updateAheadBehindCount().then(() => this.emitUpdateEvent())
    }))

    this.subscriptions.add(atom.config.observe('github.fetchIntervalInSeconds', (interval: number) => {
      if (this.intervalId !== -1) {
        window.clearInterval(this.intervalId)
        this.intervalId = -1
      }

      if (interval) {
        this.intervalId = window.setInterval(() => {
          if (!this.hasRequestsInFlight()) {
            this.fetch()
          }
        }, interval * 1000)
      }
    }))
  }

  async initialize (): Promise<void> {
    await this.updateAheadBehindCount()
    this.emitUpdateEvent()
  }

  destroy () {
    this.subscriptions.dispose()
  }

  fetch (): Promise<void> {
    return this.performNetworkAction(async () => {
      const remotes = await this.gitService.getRemotes()
      // TODO: These credentials almost certainly won't be right on all remotes,
      // but let's roll with this for now.
      const creds = this.getCredentials()

      // Gotta fetch 'em all!
      let index = 0
      for (const remote of remotes) {
        await this.gitService.fetch(remote, creds, localProgress => { // eslint-disable-line babel/no-await-in-loop
          this.progress = (localProgress + index) / remotes.length
          this.emitUpdateEvent()
        })
        index++
      }
    })
  }

  pull (): Promise<void> {
    return this.performNetworkAction(() => {
      return this.gitService.pull(this.gitStore.branchName, this.getCredentials(), progress => {
        this.progress = progress
        this.emitUpdateEvent()
      })
    })
  }

  push (): Promise<void> {
    return this.performNetworkAction(() => {
      return this.gitService.push(this.gitStore.branchName, this.getCredentials(), progress => {
        this.progress = progress
        this.emitUpdateEvent()
      })
    })
  }

  getProgressPercentage (): number {
    return this.progress * 100
  }

  async performNetworkAction (fn: () => Promise<void>): Promise<void> {
    this.progress = 0
    this.inFlightRequests++
    this.emitUpdateEvent()

    try {
      await fn()
    } finally {
      await this.updateAheadBehindCount()
      this.inFlightRequests--
      this.progress = 1
      this.emitUpdateEvent()
      this.progress = 0
    }
  }

  async updateAheadBehindCount (): Promise<void> {
    let count = await this.gitService.getAheadBehindCount(this.gitStore.branchName)
    this.behindCount = count.behind
    this.aheadCount = count.ahead
  }

  getBehindCount (): number {
    return this.behindCount
  }

  getAheadCount (): number {
    return this.aheadCount
  }

  getCredentials (): {username: string, password: string} {
    return {username: this.gitHubService.getToken() || '', password: 'x-oauth-basic'}
  }

  setGitHubService (gitHubService: GitHubService) {
    this.gitHubService = gitHubService
  }

  hasRequestsInFlight (): boolean {
    return this.inFlightRequests > 0
  }

  onDidUpdate (fn: Function): Disposable {
    return this.emitter.on('did-update', fn)
  }

  emitUpdateEvent () {
    let shouldUpdate =
      this.progress !== this.oldProgress ||
      this.aheadCount !== this.oldAheadCount ||
      this.behindCount !== this.oldBehindCount ||
      this.inFlightRequests !== this.oldInFlightRequests

    if (shouldUpdate) {
      this.oldProgress = this.progress
      this.oldAheadCount = this.aheadCount
      this.oldBehindCount = this.behindCount
      this.oldInFlightRequests = this.inFlightRequests
      this.emitter.emit('did-update')
    }
  }
}
