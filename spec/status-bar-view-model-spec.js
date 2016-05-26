/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {GitRepositoryAsync} from 'atom'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'
import StatusBarViewModel from '../lib/status-bar-view-model'
import {copyRepository} from './helpers'

describe('StatusBarViewModel', () => {
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

    viewModel = new StatusBarViewModel(gitStore)
  })

  describe('::getChangedFileCount', () => {
    it('returns the number of changed files', () => {
      expect(viewModel.getChangedFileCount()).toBe(2)
    })
  })
})
