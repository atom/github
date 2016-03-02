/* @flow */

import {Emitter} from 'atom'

import type {Disposable} from 'atom'
import type GitService from './git-service'

export default class StatusBarViewModel {
  emitter: Emitter;
  gitService: GitService;
  changedFileCount: number;

  constructor (gitService: GitService) {
    this.emitter = new Emitter()
    this.gitService = gitService
    this.changedFileCount = 0

    this.update()
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent () {
    this.emitter.emit('did-change')
  }

  async update (): Promise<void> {
    const statuses = await this.gitService.getStatuses()
    const newCount = Object.keys(statuses).length
    if (newCount !== this.changedFileCount) {
      this.changedFileCount = newCount
      this.emitChangeEvent()
    }
  }

  getChangedFileCount (): number { return this.changedFileCount }
}
