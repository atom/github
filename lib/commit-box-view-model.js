/* @flow */

import {Emitter} from 'atom'

import type {Disposable} from 'atom'
import type GitService from './git-service'

export default class CommitBoxViewModel {
  _emitter: Emitter;
  _gitService: GitService;
  _branchName: string;

  constructor (gitService: GitService) {
    this._emitter = new Emitter()
    this._gitService = gitService

    this.update()
  }

  async update (): Promise<void> {
    const previousBranchName = this._branchName
    this._branchName = await this._gitService.getCurrentBranchName()
    if (this._branchName !== previousBranchName) {
      this.emitChangeEvent()
    }
  }

  onDidChange (callback: Function): Disposable {
    return this._emitter.on('did-change', callback)
  }

  emitChangeEvent () {
    this._emitter.emit('did-change')
  }

  getBranchName (): string { return this._branchName }

  async commit (message: string): Promise<void> {
    return Promise.resolve()
  }
}
