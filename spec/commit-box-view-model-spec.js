/** @babel */

import path from 'path'
import fs from 'fs-plus'
import GitService from '../lib/git-service'
import CommitBoxViewModel from '../lib/commit-box-view-model'
import {copyRepository} from './helpers'
import {waitsForPromise, it} from './async-spec-helpers'

describe('CommitBoxViewModel', () => {
  let viewModel
  let gitService
  let repoPath

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = new GitService(repoPath)

    viewModel = new CommitBoxViewModel(gitService)
    waitsForPromise(() => viewModel.update())
  })

  describe('::getBranchName', () => {
    it('returns the current branch', () => {
      expect(viewModel.getBranchName()).toBe('master')
    })
  })

  describe('::commit', () => {
    it('emits a user change event', async () => {
      let changeHandler = jasmine.createSpy()
      viewModel.onDidUserChange(changeHandler)

      await viewModel.commit('hey there')

      expect(changeHandler).toHaveBeenCalled()
    })

    it('commits the staged changes', async () => {
      const newFileName = 'new-file.txt'
      const newFile = path.join(repoPath, newFileName)
      fs.writeFileSync(newFile, 'my fav file')

      let statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).not.toBeUndefined()

      await gitService.stagePath(newFileName)
      await viewModel.commit('hey there')

      statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).toBeUndefined()
    })
  })
})
