/* @flow */

import path from 'path'
import DiffHunk from './diff-hunk'
import {DiffURI} from './common'
import {ifNotNull} from './common'

import type {ConvenientPatch, StatusFile} from 'nodegit'
import type {StageStatus} from './diff-hunk'

export type ChangeStatus = 'added' | 'deleted' | 'renamed' | 'modified'

// FileDiff contains diff information for a single file. It holds a list of
// DiffHunk objects.
export default class FileDiff {
  hunks: Array<DiffHunk>;
  oldPathName: ?string;
  newPathName: ?string;
  size: number;
  mode: number;
  inIndex: boolean;

  added: boolean;
  deleted: boolean;
  renamed: boolean;
  untracked: boolean;

  constructor (options: {oldPathName?: string, newPathName?: string, changeStatus?: ChangeStatus} = {}) {
    const {oldPathName, newPathName, changeStatus} = options
    this.setHunks([])
    this.setOldPathName(oldPathName || 'unknown')
    this.setNewPathName(newPathName || 'unknown')
    this.setChangeStatus(changeStatus || 'modified')
  }

  getHunks (): Array<DiffHunk> { return this.hunks }

  setHunks (hunks: Array<DiffHunk>) {
    this.hunks = hunks
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
  }

  getInIndex (): boolean { return this.inIndex }

  stage () {
    if (this.hunks.length > 0) {
      for (let hunk of this.hunks) {
        hunk.stage()
      }
    } else {
      this.inIndex = true
    }
  }

  unstage () {
    if (this.hunks.length > 0) {
      for (let hunk of this.hunks) {
        hunk.unstage()
      }
    } else {
      this.inIndex = false
    }
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

  toString (): string {
    let hunks = this.hunks.map(hunk => hunk.toString()).join('\n')
    return `FILE ${this.getNewPathName()} - ${this.getChangeStatus()} - ${this.getStageStatus()}\n${hunks}`
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

  async fromGitUtilsObject ({diff, stagedDiff, unstagedDiff, statusFile}: {diff: ConvenientPatch, stagedDiff: ConvenientPatch, unstagedDiff: ConvenientPatch, statusFile: StatusFile}): Promise<void> {
    if (!diff) return

    const stagedHunks = await this.createHunksFromDiff(stagedDiff, true)
    const unstagedHunks = await this.createHunksFromDiff(unstagedDiff, false)
    const hunks = stagedHunks.concat(unstagedHunks)

    this.inIndex = statusFile.inIndex() && !statusFile.inWorkingTree()

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

    this.size = diff.size()
    this.renamed = diff.isRenamed()
    this.added = diff.isAdded()
    this.untracked = diff.isUntracked()
    this.deleted = diff.isDeleted()
    this.mode = ifNotNull(diff.newFile(), f => f.mode()) || ifNotNull(diff.oldFile(), f => f.mode()) || 0
    this.setOldPathName(ifNotNull(diff.oldFile(), f => f.path()))
    this.setNewPathName(ifNotNull(diff.newFile(), f => f.path()))
    this.setHunks(hunks)
  }
}
