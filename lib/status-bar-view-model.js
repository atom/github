/* @flow */

import {Emitter, CompositeDisposable} from 'atom'

import type {Disposable} from 'atom'
import type GitStore from './git-store'

export default class StatusBarViewModel {
  emitter: Emitter;
  gitStore: GitStore;
  subscriptions: CompositeDisposable;

  constructor (gitStore: GitStore) {
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()
    this.gitStore = gitStore

    this.gitStore.onDidUpdate(() => this.emitUpdateEvent())
  }

  destroy () {
    this.subscriptions.dispose()
  }

  onDidUpdate (callback: Function): Disposable {
    return this.emitter.on('did-update', callback)
  }

  emitUpdateEvent () {
    this.emitter.emit('did-update')
  }

  getChangedFileCount (): number { return this.gitStore.getFiles().length }
}
