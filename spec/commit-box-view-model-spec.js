/** @babel */

import {GitRepositoryAsync} from 'atom'
import path from 'path'
import fs from 'fs-plus'
import {Point} from 'atom'
import GitService from '../lib/git-service'
import CommitBoxViewModel from '../lib/commit-box-view-model'
import {SummaryPreferredLength} from '../lib/commit-box-view-model'
import {copyRepository} from './helpers'
import {waitsForPromise, it} from './async-spec-helpers'

describe('CommitBoxViewModel', () => {
  let viewModel
  let gitService
  let repoPath

  beforeEach(() => {
    repoPath = copyRepository()

    gitService = new GitService(GitRepositoryAsync.open(repoPath))

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

  describe('.calculateRemainingCharacters', () => {
    const summary = 'hey kids!'
    const description = 'Version control is good and good for you!'
    const msg = `${summary}\n\n${description}`

    describe('when the summary is being edited', () => {
      it('counts down from 50', () => {
        const remaining = viewModel.calculateRemainingCharacters(msg, new Point(0, 0))
        expect(remaining).toBe(SummaryPreferredLength - summary.length)
      })
    })

    describe('when the description is being edited', () => {
      it('is infinite', () => {
        const msg = 'hey kids!\n\nVersion control is good and good for you!'
        const remaining = viewModel.calculateRemainingCharacters(msg, new Point(3, 0))
        expect(isFinite(remaining)).toBe(false)
      })
    })
  })
})
