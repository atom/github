/** @babel */

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

import FileDiff from './file-diff'
import Hunk from './hunk'
import HunkLine from './hunk-line'

import {applyPatch} from 'diff'
import fs from 'fs'
import path from 'path'

function readFile (path) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, function (err, buffer) {
      if (err) {
        reject(err)
      } else {
        resolve(buffer)
      }
    })
  })
}

const diffOpts = {
  flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS
}

const findOpts = {
  flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED
}

export default class Repository {
  constructor (rawRepository, workingDirectory) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
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
    const tree = await headCommit.getTree()

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
      const oldTree = await this.rawRepository.getTree(await index.writeTree())
      const builder = await Git.Treebuilder.create(this.rawRepository, oldTree)
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await builder.insert(fileDiff.getOldPath(), newBlobOid, fileDiff.getNewMode())
      const newTree = await this.rawRepository.getTree(builder.write())
      await index.readTree(newTree)
    } else if (fileDiff.status === 'removed') {
      const oldTree = await this.rawRepository.getTree(await index.writeTree())
      const builder = await Git.Treebuilder.create(this.rawRepository, oldTree)
      await builder.remove(fileDiff.getOldPath())
      const newTree = await this.rawRepository.getTree(builder.write())
      await index.readTree(newTree)
    } else if (fileDiff.status === 'renamed') {
      const oldIndexEntry = await index.getByPath(fileDiff.getOldPath(), 0)
      const newContents = await readFile(path.join(this.rawRepository.workdir(), fileDiff.getNewPath()))
      const oldTree = await this.rawRepository.getTree(await index.writeTree())
      const builder = await Git.Treebuilder.create(this.rawRepository, oldTree)
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await builder.remove(fileDiff.getOldPath())
      await builder.insert(fileDiff.getNewPath(), newBlobOid, fileDiff.getNewMode())
      const newTree = await this.rawRepository.getTree(builder.write())
      await index.readTree(newTree)
    } else if (fileDiff.status === 'added') {
      const newContents = await readFile(path.join(this.rawRepository.workdir(), fileDiff.getNewPath()))
      const oldTree = await this.rawRepository.getTree(await index.writeTree())
      const builder = await Git.Treebuilder.create(this.rawRepository, oldTree)
      const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
      await builder.insert(fileDiff.getNewPath(), newBlobOid, fileDiff.getNewMode())
      const newTree = await this.rawRepository.getTree(builder.write())
      await index.readTree(newTree)
    }

    this.stagedChangesPromise = null
    this.unstagedChangesPromise = null
  }

  async unstageFileDiff (fileDiff) {
    if (fileDiff.status === 'modified') {
      for (let hunk of fileDiff.getHunks()) {
        const lines = hunk.getLines().map(l => l.getRawLine())
        await this.rawRepository.stageLines(fileDiff.getOldPath(), lines, true)
      }
    } else {
      const commit = await this.rawRepository.getHeadCommit()
      if (fileDiff.status === 'renamed') {
        await Git.Reset.default(this.rawRepository, commit, fileDiff.getOldPath())
      }
      await Git.Reset.default(this.rawRepository, commit, fileDiff.getNewPath())
    }

    this.stagedChangesPromise = null
    this.unstagedChangesPromise = null
  }

  async buildFileDiffsFromRawDiff (rawDiff) {
    const fileDiffs = []
    for (let rawPatch of await rawDiff.patches()) {
      const hunks = []
      for (let rawHunk of await rawPatch.hunks()) {
        const lines = []
        for (let rawLine of await rawHunk.lines()) {
          let text = rawLine.content()
          if (text.endsWith('\n') || text.endsWith('\r')) {
            text = text.slice(0, -1)
          } else if (text.endsWith('\r\n')) {
            text = text.slice(0, -2)
          }

          const origin = String.fromCharCode(rawLine.origin())
          let status
          if (origin === '+') {
            status = 'added'
          } else if (origin === '-') {
            status = 'removed'
          } else {
            status = 'unchanged'
          }

          lines.push(new HunkLine(text, status, rawLine.oldLineno(), rawLine.newLineno(), rawLine))
        }
        hunks.push(new Hunk(lines, rawHunk.oldStart(), rawHunk.newStart(), rawHunk.oldLines(), rawHunk.newLines()))
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
