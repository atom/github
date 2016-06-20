/** @babel */

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

import FileDiff from './file-diff'
import Hunk from './hunk'
import HunkLine from './hunk-line'

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

  async refreshUnstagedChanges () {
    return this.unstagedChangesPromise = this.fetchUnstagedChanges()
  }

  async fetchUnstagedChanges () {
    const diff = await Git.Diff.indexToWorkdir(
      this.rawRepository,
      await this.rawRepository.index(),
      {flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS}
    )
    await diff.findSimilar({flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED})
    return this.buildFileDiffsFromRawDiff(diff)
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
      if (rawPatch.isUntracked()) {
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
