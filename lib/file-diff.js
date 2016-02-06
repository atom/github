/** @babel */

import path from 'path'
import Common from './common'
import DiffHunk from './diff-hunk'
import EventTransactor from './event-transactor'
import {createObjectsFromString} from './common'
import {Emitter, CompositeDisposable} from 'atom'

// FileDiff contains diff information for a single file. It holds a list of
// DiffHunk objects.
export default class FileDiff {
  constructor (options) {
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter, {file: this})

    const {oldPathName, newPathName, changeStatus} = options || {}
    this.setHunks([])
    this.setOldPathName(oldPathName || 'unknown')
    this.setNewPathName(newPathName || 'unknown')
    this.setChangeStatus(changeStatus || 'modified')
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  didChange (event) {
    this.transactor.didChange(event)
  }

  getHunks () { return this.hunks }

  setHunks (hunks) {
    if (this.hunkSubscriptions) {
      this.hunkSubscriptions.dispose()
    }
    this.hunkSubscriptions = new CompositeDisposable()
    this.hunks = hunks

    for (const hunk of hunks)
      this.hunkSubscriptions.add(hunk.onDidChange(this.didChange.bind(this)))
    this.didChange()
  }

  getOldFileName () { return path.basename(this.getOldPathName()) }

  getOldPathName () { return this.oldPathName }

  setOldPathName (oldPathName) {
    this.oldPathName = oldPathName
    this.didChange()
  }

  getNewFileName () { return path.basename(this.getNewPathName()) }

  getNewPathName () { return this.newPathName }

  setNewPathName (newPathName) {
    this.newPathName = newPathName
    this.didChange()
  }

  size () { return this.size }

  getChangeStatus () {
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

  setChangeStatus (changeStatus) {
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

  stage () {
    this.transactor.transact(() => {
      for (let hunk of this.hunks)
        hunk.stage()
    })
  }

  unstage () {
    this.transactor.transact(() => {
      for (let hunk of this.hunks)
        hunk.unstage()
    })
  }

  getStageStatus () {
    // staged, unstaged, partial
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
  }

  isRenamed () { return this.renamed }

  isAdded () { return this.added }

  isUntracked () { return this.untracked }

  isDeleted () { return this.deleted }

  openDiff () {
    return atom.workspace.open(Common.DiffURI + this.getNewPathName(), {pending: true})
  }

  isSyncingState() {
    return !!this.isSyncing
  }

  syncState(fn) {
    this.isSyncing = true
    fn()
    this.isSyncing = false
  }

  toString () {
    let hunks = this.hunks.map((hunk) => { return hunk.toString() }).join('\n')
    return `FILE ${this.getNewPathName()} - ${this.getChangeStatus()} - ${this.getStageStatus()}\n${hunks}`
  }

  fromString (diffStr) {
    let metadata = /FILE (.+) - (.+) - (.+)/.exec(diffStr.trim().split('\n')[0])
    if (!metadata) return null

    let [, pathName, changeStatus] = metadata
    let hunks = createObjectsFromString(diffStr, 'HUNK', DiffHunk)

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

  async createHunksFromDiff (diff, isStaged, stageFn) {
    if (!diff) return []

    const hunks = []
    for (const hunk of (await diff.hunks())) {
      let diffHunk = new DiffHunk()
      await diffHunk.fromGitUtilsObject({hunk, isStaged, fileName: diff.oldFile().path(), stageFn})
      hunks.push(diffHunk)
    }
    return hunks
  }

  async fromGitUtilsObject ({diff, stagedDiff, unstagedDiff, stageFn}) {
    if (!diff) return

    const stagedHunks = await this.createHunksFromDiff(stagedDiff, true, stageFn)
    const unstagedHunks = await this.createHunksFromDiff(unstagedDiff, false, stageFn)
    const hunks = stagedHunks.concat(unstagedHunks)

    hunks.sort((hunk1, hunk2) => {
      const firstLine1 = hunk1.getLines()[0]
      const firstLine2 = hunk2.getLines()[0]
      const lineNumber1 = firstLine1.isAddition() ? firstLine1.getNewLineNumber() : firstLine1.getOldLineNumber()
      const lineNumber2 = firstLine2.isAddition() ? firstLine2.getNewLineNumber() : firstLine2.getOldLineNumber()
      return lineNumber1 - lineNumber2
    })

    this.syncState(() => {
      this.transactor.transact(() => {
        this.size = diff.size()
        this.renamed = diff.isRenamed()
        this.added = diff.isAdded()
        this.untracked = diff.isUntracked()
        this.deleted = diff.isDeleted()
        this.setOldPathName(diff.oldFile().path())
        this.setNewPathName(diff.newFile().path())
        this.setHunks(hunks)
      })
    })
  }
}
