/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {GitRepositoryAsync} from 'atom'
import GitService from '../../lib/git/git-service'
import GitStore from '../../lib/git/git-store'
import GitStatusBarViewModel from '../../lib/git/status-bar/git-status-bar-view-model'
import {copyRepository} from './git-helpers'

describe('GitStatusBarViewModel', () => {
  let viewModel
  let gitStore
  let repoPath

  beforeEach(async () => {
    repoPath = copyRepository()

    const gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)

    fs.writeFileSync(path.join(repoPath, 'file1.txt'), '')
    fs.writeFileSync(path.join(repoPath, 'file2.txt'), '')

    await gitStore.loadFromGit()

    viewModel = new GitStatusBarViewModel(gitStore)
  })

  describe('::getChangedFileCount', () => {
    it('returns the number of changed files', () => {
      expect(viewModel.getChangedFileCount()).toBe(2)
    })
  })
})
