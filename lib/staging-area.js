/** @babel */

import {GitRepositoryAsync} from 'atom'
import ChangedFile from './changed-file'
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
    for (let patch of await diff.patches()) {
      let status = null
      if (patch.isUntracked()) status = 'created'
      else if (patch.isModified()) status = 'modified'
      else if (patch.isDeleted()) status = 'deleted'
      else if (patch.isRenamed()) status = 'renamed'

      this.changedFiles.push(new ChangedFile(patch.oldFile().path(), patch.newFile().path(), status))
    }
  }

  getChangedFiles () {
    return this.changedFiles
  }
}
