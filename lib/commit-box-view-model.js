/* @flow */

import {Emitter} from 'atom'

import type {Disposable, Point} from 'atom'
import type GitService from './git-service'

export const SummaryPreferredLength = 50

export default class CommitBoxViewModel {
  emitter: Emitter;
  gitService: GitService;
  branchName: string;

  constructor (gitService: GitService) {
    this.emitter = new Emitter()
    this.gitService = gitService

    this.update()
  }

  async update (): Promise<void> {
    const previousBranchName = this.branchName
    this.branchName = await this.gitService.getCurrentBranchName()
    if (this.branchName !== previousBranchName) {
      this.emitChangeEvent()
    }
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent () {
    this.emitter.emit('did-change')
  }

  onDidCommit (callback: Function): Disposable {
    return this.emitter.on('did-commit', callback)
  }

  emitDidCommitEvent () {
    this.emitter.emit('did-commit')
  }

  getBranchName (): string { return this.branchName }

  async commit (message: string): Promise<void> {
    await this.gitService.commit(message)
    this.emitDidCommitEvent()
  }

  calculateRemainingCharacters (msg: string, cursorPosition: Point): number {
    const editingState = getMessageEditingState(msg, cursorPosition)
    if (editingState === 'summary') {
      const lines = msg.split('\n')
      const len = lines[0].length
      return SummaryPreferredLength - len
    } else {
      return Infinity
    }
  }
}

function getMessageEditingState (msg: string, cursorPosition: Point): 'summary' | 'description' {
  if (cursorPosition.row === 0) return 'summary'

  const parts = msg.split('\n')
  if (parts.length < 3) return 'summary'

  return 'description'
}
