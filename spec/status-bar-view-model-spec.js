/** @babel */

import path from 'path'
import fs from 'fs-plus'
import {GitRepositoryAsync} from 'atom'
import GitService from '../lib/git-service'
import StatusBarViewModel from '../lib/status-bar-view-model'
import {copyRepository} from './helpers'
import {waitsForPromise, it} from './async-spec-helpers'

describe('StatusBarViewModel', () => {
  let viewModel
  let gitService
  let repoPath

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = new GitService(GitRepositoryAsync.open(repoPath))

    fs.writeFileSync(path.join(repoPath, 'file1.txt'), '')
    fs.writeFileSync(path.join(repoPath, 'file2.txt'), '')

    viewModel = new StatusBarViewModel(gitService)
    waitsForPromise(() => viewModel.update())
  })

  describe('::getChangedFileCount', () => {
    it('returns the number of changed files', () => {
      expect(viewModel.getChangedFileCount()).toBe(2)
    })
  })
})
