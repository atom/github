/** @babel */

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

import FileDiff from './file-diff'
import Hunk from './hunk'
import HunkLine from './hunk-line'

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

  clearChanges () {
    this.stagedChangesPromise = null
    this.unstagedChangesPromise = null
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
    const repo = this.rawRepository
    const headCommit = await repo.getHeadCommit()
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
    if (fileDiff.status === 'removed') {
      await index.removeByPath(fileDiff.getOldPath())
    } else if (fileDiff.status === 'renamed') {
      await index.removeByPath(fileDiff.getOldPath())
      await index.addByPath(fileDiff.getNewPath())
    } else {
      await index.addByPath(fileDiff.getNewPath())
    }

    await index.write()
    this.clearChanges()
  }

  async unstageFileDiff (fileDiff) {
    const repo = this.rawRepository
    if (repo.isEmpty()) {
      const index = await repo.index()
      await index.removeByPath(fileDiff.getNewPath())
      await index.write()
    } else {
      const commit = await repo.getHeadCommit()
      if (fileDiff.status === 'renamed') {
        await Git.Reset.default(repo, commit, fileDiff.getOldPath()) // github-archive has `fileDiff.getOldPath() || ''`??
      }
      await Git.Reset.default(repo, commit, fileDiff.getNewPath()) // github-archive has `fileDiff.getOldPath() || ''`??
    }
    this.clearChanges()
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

          lines.push(new HunkLine(text, status, rawLine.oldLineno(), rawLine.newLineno()))
        }
        hunks.push(new Hunk(lines))
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
        status,
        hunks
      ))
    }

    return fileDiffs
  }
}
