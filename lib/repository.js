/** @babel */

import {GitRepositoryAsync, Emitter} from 'atom'
const Git = GitRepositoryAsync.Git

import FileDiff from './file-diff'
import Hunk from './hunk'
import HunkLine from './hunk-line'

import {applyPatch} from 'diff'

const diffOpts = {flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS}
const findOpts = {flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED}

export default class Repository {
  constructor (rawRepository, workingDirectory) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
    this.emitter = new Emitter()
  }

  onDidUpdate (callback) {
    return this.emitter.on('did-update', callback)
  }

  didUpdate () {
    this.emitter.emit('did-update')
  }

  getWorkingDirectory () {
    return this.workingDirectory
  }

  async getUnstagedChanges () {
    return this.unstagedChangesPromise || this.refreshUnstagedChanges()
  }

  async getStagedChanges () {
    return this.stagedChangesPromise || this.refreshStagedChanges()
  }

  async refreshUnstagedChanges () {
    return this.unstagedChangesPromise = this.fetchUnstagedChanges()
  }

  async refreshStagedChanges () {
    return this.stagedChangesPromise = this.fetchStagedChanges()
  }

  async fetchUnstagedChanges () {
    const diff = await Git.Diff.indexToWorkdir(
      this.rawRepository,
      await this.rawRepository.index(),
      diffOpts
    )
    await diff.findSimilar(findOpts)
    return this.buildFileDiffsFromRawDiff(diff)
  }

  async fetchStagedChanges () {
    const headCommit = await this.rawRepository.getHeadCommit()
    let tree
    if (headCommit) {
      tree = await headCommit.getTree()
    } else {
      const builder = await Git.Treebuilder.create(this.rawRepository, null)
      tree = await this.rawRepository.getTree(builder.write())
    }

    const diff = await Git.Diff.treeToIndex(
      this.rawRepository,
      tree,
      await this.rawRepository.index(),
      diffOpts
    )
    await diff.findSimilar(findOpts)
    return this.buildFileDiffsFromRawDiff(diff)
  }

  async stageFileDiff (fileDiff) {
    const index = await this.rawRepository.index()
    if (fileDiff.status === 'modified') {
      const oldIndexEntry = await index.getByPath(fileDiff.getOldPath(), 0)
      const oldBlob = await this.rawRepository.getBlob(oldIndexEntry.id)
      const newContents = Buffer.from(applyPatch(oldBlob.toString(), fileDiff.toString()))
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await index.add(this.buildIndexEntry(newBlobOid, fileDiff.getNewMode(), fileDiff.getOldPath(), newContents.length))
    } else if (fileDiff.status === 'removed') {
      await index.remove(fileDiff.getOldPath(), 0)
    } else if (fileDiff.status === 'renamed') {
      const oldIndexEntry = await index.getByPath(fileDiff.getOldPath(), 0)
      const oldBlob = await this.rawRepository.getBlob(oldIndexEntry.id)
      const newContents = Buffer.from(applyPatch(oldBlob.toString(), fileDiff.toString()))
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await index.remove(fileDiff.getOldPath(), 0)
      await index.add(this.buildIndexEntry(newBlobOid, fileDiff.getNewMode(), fileDiff.getNewPath(), newContents.length))
    } else if (fileDiff.status === 'added') {
      const newContents = Buffer.from(applyPatch('', fileDiff.toString()))
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await index.add(this.buildIndexEntry(newBlobOid, fileDiff.getNewMode(), fileDiff.getNewPath(), newContents.length))
    }

    await index.write()
    this.stagedChangesPromise = null
    this.unstagedChangesPromise = null
    this.didUpdate()
  }

  unstageFileDiff (fileDiff) {
    return this.stageFileDiff(fileDiff.invert())
  }

  buildIndexEntry (oid, mode, path, fileSize) {
    const entry = new Git.IndexEntry()
    entry.id = oid
    entry.mode = mode
    entry.path = path
    entry.fileSize = fileSize
    entry.flags = 0
    entry.flagsExtended = 0
    return entry
  }

  async buildFileDiffsFromRawDiff (rawDiff) {
    const fileDiffs = []
    for (let rawPatch of await rawDiff.patches()) {
      const hunks = []
      for (let rawHunk of await rawPatch.hunks()) {
        const lines = []
        for (let rawLine of await rawHunk.lines()) {
          let text = rawLine.content()
          const origin = String.fromCharCode(rawLine.origin())
          let status
          if (origin === '+') {
            status = 'added'
          } else if (origin === '-') {
            status = 'removed'
          } else if (origin === ' ') {
            status = 'unchanged'
          }

          lines.push(new HunkLine(text, status, rawLine.oldLineno(), rawLine.newLineno()))
        }
        hunks.push(new Hunk(rawHunk.oldStart(), rawHunk.newStart(), rawHunk.oldLines(), rawHunk.newLines(), lines))
      }

      let status
      if (rawPatch.isUntracked() || rawPatch.isAdded()) {
        status = 'added'
      } else if (rawPatch.isModified()) {
        status = 'modified'
      } else if (rawPatch.isDeleted()) {
        status = 'removed'
      } else if (rawPatch.isRenamed()) {
        status = 'renamed'
      } else {
        throw new Error('Unknown status for raw patch')
      }

      fileDiffs.push(new FileDiff(
        rawPatch.oldFile().path(),
        rawPatch.newFile().path(),
        rawPatch.oldFile().mode(),
        rawPatch.newFile().mode(),
        status,
        hunks
      ))
    }

    return fileDiffs
  }
}
