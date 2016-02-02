/** @babel */

import path from 'path'
import DiffHunk from './diff-hunk'
import HunkLine from './hunk-line'
import {createObjectsFromString} from './common'
import {Emitter, CompositeDisposable} from 'atom'

// FileDiff contains diff information for a single file. It holds a list of
// DiffHunk objects.
export default class FileDiff {
  constructor(options) {
    this.emitter = new Emitter()
    this.setHunks([])
    this.setOldPathName('unknown')
    this.setNewPathName('unknown')
    this.setChangeStatus('modified')
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent(event) {
    this.emitter.emit('did-change', event)
  }

  getHunks() { return this.hunks }

  setHunks(hunks) {
    if (this.hunkSubscriptions)
      this.hunkSubscriptions.dispose()
    this.hunkSubscriptions = new CompositeDisposable
    this.hunks = hunks

    for (const hunk of hunks)
      this.hunkSubscriptions.add(hunk.onDidChange(this.hunkDidChange.bind(this, hunk)))
  }

  getOldFileName() { return path.basename(this.getOldPathName()) }

  getOldPathName() { return this.oldPathName }

  setOldPathName(oldPathName) {
    this.oldPathName = oldPathName
  }

  getNewFileName() { return path.basename(this.getNewPathName()) }

  getNewPathName() { return this.newPathName }

  setNewPathName(newPathName) {
    this.newPathName = newPathName
  }

  size() { return this.size }

  getChangeStatus() {
    if (this.isAdded())
      return 'added'
    else if (this.isDeleted())
      return 'deleted'
    else if (this.isRenamed())
      return 'renamed'
    else
      return 'modified'
  }

  setChangeStatus(changeStatus) {
    switch (changeStatus) {
      case 'added':
        this.added = true
        this.renamed = false
        this.deleted = false
        break;
      case 'deleted':
        this.added = false
        this.renamed = false
        this.deleted = true
        break;
      case 'reamed':
        this.added = false
        this.renamed = true
        this.deleted = false
        break;
      case 'modified':
        this.added = false
        this.renamed = false
        this.deleted = false
        break;
    }
  }

  stage() {
    this.transact(() => {
      for (let hunk of this.hunks)
        hunk.stage()
    })
  }

  unstage() {
    this.transact(() => {
      for (let hunk of this.hunks)
        hunk.unstage()
    })
  }

  getStageStatus() {
    // staged, unstaged, partial
    let hasStaged = false
    let hasUnstaged = false
    for (let hunk of this.hunks) {
      let stageStatus = hunk.getStageStatus()
      if (stageStatus == 'partial')
        return 'partial'
      else if (stageStatus == 'staged')
        hasStaged = true
      else
        hasUnstaged = true
    }

    if (hasStaged && hasUnstaged)
      return 'partial'
    else if (hasStaged)
      return 'staged'
    return 'unstaged'
  }

  isRenamed() { return this.renamed }

  isAdded() { return this.added }

  isUntracked() { return this.untracked }

  isDeleted() { return this.deleted }

  transact(fn) {
    this.currentChangeTransactionHunks = []
    fn()
    if (this.currentChangeTransactionHunks.length)
      this.emitChangeEvent({hunks: this.currentChangeTransactionHunks})
    this.currentChangeTransactionHunks = null
  }

  hunkDidChange(hunk) {
    if (this.currentChangeTransactionHunks)
      this.currentChangeTransactionHunks.push(hunk)
    else
      this.emitChangeEvent({hunks: [hunk]})
  }

  toString() {
    let hunks = this.hunks.map((hunk) => { return hunk.toString() }).join('\n');
    return `FILE ${this.getNewPathName()} - ${this.getChangeStatus()} - ${this.getStageStatus()}\n${hunks}`
  }

  static fromString(diffStr) {
    let metadata = /FILE (.+) - (.+) - (.+)/.exec(diffStr.trim().split('\n')[0])
    if (!metadata) return null;

    let [__, pathName, changeStatus, stagedStatus] = metadata
    let hunks = createObjectsFromString(diffStr, 'HUNK', DiffHunk)

    let fileDiff = new FileDiff()
    fileDiff.setNewPathName(pathName)
    fileDiff.setOldPathName(pathName)
    fileDiff.setChangeStatus(changeStatus)
    fileDiff.setHunks(hunks)

    return fileDiff
  }

  async fromGitUtilsObject({diff, stagedDiff}) {
    if (!diff) return;

    this.oldPathName = diff.oldFile().path()
    this.newPathName = diff.newFile().path()
    this.size = diff.size()
    this.renamed = diff.isRenamed()
    this.added = diff.isAdded()
    this.untracked = diff.isUntracked()
    this.deleted = diff.isDeleted()

    let hunks = []
    let stagedLines = []
    if (stagedDiff) {
      // TODO: This all happens sequentially which is a bit of a bummer.
      const hunks = await stagedDiff.hunks()
      for (const hunk of hunks) {
        const lines = await hunk.lines()
        stagedLines = stagedLines.concat(lines)
      }
    }

    stagedLines = stagedLines
      .map(line => HunkLine.fromGitUtilsObject({line}))
      .filter(line => line.isChanged())

    console.log('all staged:');
    for (const l of stagedLines) {
      console.log(l.toString());
    }

    for (let hunk of (await diff.hunks())) {
      let diffHunk = new DiffHunk()
      diffHunk.fromGitUtilsObject({hunk, stagedLines})
      hunks.push(diffHunk)
    }

    this.setHunks(hunks)
  }
}
