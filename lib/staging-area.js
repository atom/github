/** @babel */

import {GitRepositoryAsync} from 'atom'
import ChangedFile from './changed-file'
import Hunk from './hunk'
import HunkLine from './hunk-line'
const Git = GitRepositoryAsync.Git

export default class StagingArea {
  constructor (rawRepository) {
    this.rawRepository = rawRepository
    this.changedFiles = []
  }

  async refresh () {
    const headCommit = await this.rawRepository.getHeadCommit()
    const headTree = await headCommit.getTree()
    const diff = await Git.Diff.treeToWorkdir(this.rawRepository, headTree, {
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS
    })
    await diff.findSimilar({flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED})

    this.changedFiles = []
    for (let rawPatch of await diff.patches()) {
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
            status = 'deleted'
          } else {
            status = 'unchanged'
          }

          lines.push(new HunkLine(text, status, rawLine.oldLineno(), rawLine.newLineno()))
        }
        hunks.push(new Hunk(lines))
      }

      let status
      if (rawPatch.isUntracked()) {
        status = 'created'
      } else if (rawPatch.isModified()) {
        status = 'modified'
      } else if (rawPatch.isDeleted()) {
        status = 'deleted'
      } else if (rawPatch.isRenamed()) {
        status = 'renamed'
      } else {
        throw new Error('Unknown status for raw patch')
      }

      this.changedFiles.push(new ChangedFile(
        rawPatch.oldFile().path(),
        rawPatch.newFile().path(),
        status,
        hunks
      ))
    }
  }

  getChangedFiles () {
    return this.changedFiles
  }
}
