/* @flow */

import path from 'path'
import DiffHunk from './diff-hunk'
import EventTransactor from './event-transactor'
import {createObjectsFromString, DiffURI} from './common'
import {Emitter, CompositeDisposable} from 'atom'
import {ifNotNull} from './common'

import type {Disposable} from 'atom'
import type {ConvenientPatch} from 'nodegit'
import type {StageStatus} from './diff-hunk'

export type ChangeStatus = 'added' | 'deleted' | 'renamed' | 'modified'

// FileDiff contains diff information for a single file. It holds a list of
// DiffHunk objects.
export default class FileDiff {
  emitter: Emitter;
  transactor: EventTransactor;
  hunks: Array<DiffHunk>;
  hunkSubscriptions: CompositeDisposable;
  oldPathName: ?string;
  newPathName: ?string;
  size: number;
  mode: number;
  inIndex: boolean;

  added: boolean;
  deleted: boolean;
  renamed: boolean;
  untracked: boolean;
  isSyncing: boolean;

  constructor (options: {oldPathName?: string, newPathName?: string, changeStatus?: ChangeStatus} = {}) {
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter, {file: this})

    const {oldPathName, newPathName, changeStatus} = options
    this.setHunks([])
    this.setOldPathName(oldPathName || 'unknown')
    this.setNewPathName(newPathName || 'unknown')
    this.setChangeStatus(changeStatus || 'modified')
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  didChange (event: ?Object) {
    this.transactor.didChange(event)
  }

  getHunks (): Array<DiffHunk> { return this.hunks }

  setHunks (hunks: Array<DiffHunk>) {
    if (this.hunkSubscriptions) {
      this.hunkSubscriptions.dispose()
    }
    this.hunkSubscriptions = new CompositeDisposable()
    this.hunks = hunks

    for (const hunk of hunks) {
      this.hunkSubscriptions.add(hunk.onDidChange(this.didChange.bind(this)))
    }
    this.didChange()
  }

  getOldFileName (): ?string {
    const oldPathName = this.getOldPathName()
    if (oldPathName) {
      return path.basename(oldPathName)
    } else {
      return null
    }
  }

  getOldPathName (): ?string { return this.oldPathName }

  setOldPathName (oldPathName: ?string) {
    this.oldPathName = oldPathName
    this.didChange()
  }

  getNewFileName (): ?string {
    const newPathName = this.getNewPathName()
    if (newPathName) {
      return path.basename(newPathName)
    } else {
      return null
    }
  }

  getNewPathName (): ?string { return this.newPathName }

  setNewPathName (newPathName: ?string) {
    this.newPathName = newPathName
    this.didChange()
  }

  getSize (): number { return this.size }

  getMode (): number { return this.mode }

  getChangeStatus (): ChangeStatus {
    if (this.isAdded()) {
      return 'added'
    } else if (this.isDeleted()) {
      return 'deleted'
    } else if (this.isRenamed()) {
      return 'renamed'
    } else {
      return 'modified'
    }
  }

  setChangeStatus (changeStatus: ChangeStatus) {
    switch (changeStatus) {
      case 'added':
        this.added = true
        this.renamed = false
        this.deleted = false
        break
      case 'deleted':
        this.added = false
        this.renamed = false
        this.deleted = true
        break
      case 'reamed':
        this.added = false
        this.renamed = true
        this.deleted = false
        break
      case 'modified':
        this.added = false
        this.renamed = false
        this.deleted = false
        break
    }
    this.didChange()
  }

  getInIndex (): boolean { return this.inIndex }

  stage () {
    this.transactor.transact(() => {
      if (this.hunks.length > 0) {
        for (let hunk of this.hunks) {
          hunk.stage()
        }
      } else {
        // In the case of a renamed file or a mode change, there aren't actually
        // any changed lines but we do still need to emit a change.
        this.inIndex = true
        this.emitter.emit('did-change', {property: 'stageStatus', file: this})
      }
    })
  }

  unstage () {
    this.transactor.transact(() => {
      for (let hunk of this.hunks) {
        hunk.unstage()
      }
    })
  }

  toggleStageStatus () {
    let stageStatus = this.getStageStatus()
    if (stageStatus === 'unstaged') {
      this.stage()
    } else {
      this.unstage()
    }
  }

  getStageStatus (): StageStatus {
    if (this.hunks.length > 0) {
      let hasStaged = false
      let hasUnstaged = false
      for (let hunk of this.hunks) {
        let stageStatus = hunk.getStageStatus()
        if (stageStatus === 'partial') {
          return 'partial'
        } else if (stageStatus === 'staged') {
          hasStaged = true
        } else {
          hasUnstaged = true
        }
      }

      if (hasStaged && hasUnstaged) {
        return 'partial'
      } else if (hasStaged) {
        return 'staged'
      }

      return 'unstaged'
    } else {
      return this.inIndex ? 'staged' : 'unstaged'
    }
  }

  isRenamed (): boolean { return this.renamed }

  isAdded (): boolean { return this.added }

  isUntracked (): boolean { return this.untracked }

  isDeleted (): boolean { return this.deleted }

  openDiff ({pending}: {pending: boolean}): Promise<void> {
    const pathName = this.getNewPathName()
    if (pathName) {
      return atom.workspace.open(DiffURI + pathName, {pending})
    } else {
      return Promise.reject('Unknown path name')
    }
  }

  transact (fn: Function) {
    this.transactor.transact(fn)
  }

  isSyncingState (): boolean {
    return !!this.isSyncing
  }

  syncState (fn: Function) {
    this.isSyncing = true
    fn()
    this.isSyncing = false
  }

  toString (): string {
    let hunks = this.hunks.map((hunk) => { return hunk.toString() }).join('\n')
    return `FILE ${this.getNewPathName()} - ${this.getChangeStatus()} - ${this.getStageStatus()}\n${hunks}`
  }

  fromString (diffStr: string) {
    let metadata = /FILE (.+) - (.+) - (.+)/.exec(diffStr.trim().split('\n')[0])
    if (!metadata) return null

    let [, pathName, changeStatus] = metadata
    // $FlowBug: This should type check but doesn't.
    let hunks: Array<DiffHunk> = createObjectsFromString(diffStr, 'HUNK', DiffHunk)

    this.syncState(() => {
      this.transactor.transact(() => {
        this.setNewPathName(pathName)
        this.setOldPathName(pathName)
        this.setChangeStatus(changeStatus)
        this.setHunks(hunks)
      })
    })
  }

  static fromString (diffStr) {
    let fileDiff = new FileDiff()
    fileDiff.fromString(diffStr)
    return fileDiff
  }

  async createHunksFromDiff (diff: ConvenientPatch, isStaged: boolean): Promise<Array<DiffHunk>> {
    if (!diff) return []

    const hunks = []
    for (const hunk of (await diff.hunks())) {
      let diffHunk = new DiffHunk()
      await diffHunk.fromGitUtilsObject({hunk, isStaged, diff: this})
      hunks.push(diffHunk)
    }
    return hunks
  }

  async fromGitUtilsObject ({diff, stagedDiff, unstagedDiff}: {diff: ConvenientPatch, stagedDiff: ConvenientPatch, unstagedDiff: ConvenientPatch}): Promise<void> {
    if (!diff) return

    const stagedHunks = await this.createHunksFromDiff(stagedDiff, true)
    const unstagedHunks = await this.createHunksFromDiff(unstagedDiff, false)
    const hunks = stagedHunks.concat(unstagedHunks)

    // If we don't have a diff for either side then it must just be a rename or
    // file mode change which is already in the index.
    this.inIndex = !unstagedDiff && !stagedDiff

    hunks.sort((hunk1, hunk2) => {
      const firstLine1 = hunk1.getLines()[0]
      const firstLine2 = hunk2.getLines()[0]
      const lineNumber1 = firstLine1.isAddition() ? firstLine1.getNewLineNumber() : firstLine1.getOldLineNumber()
      const lineNumber2 = firstLine2.isAddition() ? firstLine2.getNewLineNumber() : firstLine2.getOldLineNumber()
      if (lineNumber1 && lineNumber2) {
        return lineNumber1 - lineNumber2
      } else {
        return 0
      }
    })

    this.syncState(() => {
      this.transactor.transact(() => {
        this.size = diff.size()
        this.renamed = diff.isRenamed()
        this.added = diff.isAdded()
        this.untracked = diff.isUntracked()
        this.deleted = diff.isDeleted()
        this.mode = ifNotNull(diff.newFile(), f => f.mode()) || ifNotNull(diff.oldFile(), f => f.mode()) || 0
        this.setOldPathName(ifNotNull(diff.oldFile(), f => f.path()))
        this.setNewPathName(ifNotNull(diff.newFile(), f => f.path()))
        this.setHunks(hunks)
      })
    })
  }
}
