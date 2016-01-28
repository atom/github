/** @babel */

import DiffHunk from './diff-hunk'
import {createObjectsFromString} from './common'

export default class FileDiff {
  constructor(options) {
    this.newPathName = 'unknown'
    this.oldPathName = 'unknown'
    this.hunks = []
  }

  getHunks() { return this.hunks }

  getOldPathName() { return this.oldPathName }

  setOldPathName(oldPathName) {
    this.oldPathName = oldPathName
  }

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
    for (let hunk of this.hunks)
      hunk.stage()
  }

  unstage() {
    for (let hunk of this.hunks)
      hunk.unstage()
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
    fileDiff.hunks = hunks

    return fileDiff
  }

  async fromGitUtilsObject({diff}) {
    if (!diff) return;

    this.oldPathName = diff.oldFile().path()
    this.newPathName = diff.newFile().path()
    this.size = diff.size()
    this.renamed = diff.isRenamed()
    this.added = diff.isAdded()
    this.untracked = diff.isUntracked()
    this.deleted = diff.isDeleted()

    for (let hunk of (await diff.hunks())) {
      let diffHunk = new DiffHunk()
      diffHunk.fromGitUtilsObject({hunk: hunk})
      this.hunks.push(diffHunk)
    }
  }
}
