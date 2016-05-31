/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import GitStore from '../git-store'
import GitService from '../git-service'

import type {Disposable} from 'atom' // eslint-disable-line no-duplicate-imports

export default class PushPullViewModel {
  gitStore: GitStore;
  gitService: GitService;
  token: ?string;
  inFlightRequests: number;
  emitter: Emitter;
  subscriptions: CompositeDisposable;
  progress: number;

  constructor (gitStore: GitStore) {
    this.inFlightRequests = 0

    this.gitStore = gitStore
    this.gitService = gitStore.getGitService()

    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:fetch', () => this.fetch()))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:pull', () => this.pull()))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'git:push', () => this.push()))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  fetch (): Promise<void> {
    return this.performNetworkAction(async () => {
      const remotes = await this.gitService.getRemotes()
      // TODO: These credentials almost certainly won't be right on all remotes,
      // but let's roll with this for now.
      const creds = this.getCreds()

      // Gotta fetch 'em all!
      let index = 0
      for (const remote of remotes) {
        await this.gitService.fetch(remote, creds, localProgress => { // eslint-disable-line babel/no-await-in-loop
          this.progress = (localProgress + index) / remotes.length
          this.emitter.emit('did-update')
        })
        index++
      }
    })
  }

  pull (): Promise<void> {
    return this.performNetworkAction(() => {
      return this.gitService.pull(this.gitStore.branchName, this.getCreds(), progress => {
        this.progress = progress
        this.emitter.emit('did-update')
      })
    })
  }

  push (): Promise<void> {
    return this.performNetworkAction(() => {
      return this.gitService.push(this.gitStore.branchName, this.getCreds(), progress => {
        this.progress = progress
        this.emitter.emit('did-update')
      })
    })
  }

  async getBehindCount (): Promise<number> {
    let count = await this.gitService.getAheadBehindCount(this.gitStore.branchName)
    return count.behind
  }

  async getAheadCount (): Promise<number> {
    let count = await this.gitService.getAheadBehindCount(this.gitStore.branchName)
    return count.ahead
  }

  getProgressPercentage (): number {
    return this.progress * 100
  }

  async performNetworkAction (fn: () => Promise<void>): Promise<void> {
    this.progress = 0
    this.inFlightRequests++
    this.emitter.emit('did-update')

    try {
      await fn()
    } finally {
      this.inFlightRequests--
      this.progress = 1
      this.emitter.emit('did-update')
      this.progress = 0
    }
  }

  getCreds (): {username: string, password: string} {
    return {username: this.token || '', password: 'x-oauth-basic'}
  }

  setToken (t: ?string) {
    this.token = t
  }

  hasRequestsInFlight (): boolean {
    return this.inFlightRequests > 0
  }

  onDidUpdate (fn: Function): Disposable {
    return this.emitter.on('did-update', fn)
  }
}
