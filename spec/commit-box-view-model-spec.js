/** @babel */

import {GitRepositoryAsync, Point} from 'atom'
import path from 'path'
import fs from 'fs-plus'
import GitService from '../lib/git-service'
import GitStore from '../lib/git-store'
import CommitBoxViewModel, {SummaryPreferredLength} from '../lib/commit-box-view-model'
import {copyRepository} from './helpers'
import {beforeEach, it} from './async-spec-helpers'

function stageFile (repoPath, filePath) {
  return GitRepositoryAsync.Git.Repository
    .open(repoPath)
    .then(repo => repo.index())
    .then(index => {
      index.addByPath(filePath)
      return index.write()
    })
}

describe('CommitBoxViewModel', () => {
  let viewModel
  let gitStore
  let gitService
  let repoPath

  beforeEach(async () => {
    repoPath = copyRepository()

    gitService = new GitService(GitRepositoryAsync.open(repoPath))
    gitStore = new GitStore(gitService)
    await gitStore.loadFromGit()

    viewModel = new CommitBoxViewModel(gitStore)
  })

  describe('::getBranchName', () => {
    it('returns the current branch', () => {
      expect(viewModel.getBranchName()).toBe('master')
    })
  })

  describe('::commit', () => {
    const newFileName = 'new-file.txt'

    beforeEach(async () => {
      const newFile = path.join(repoPath, newFileName)
      fs.writeFileSync(newFile, 'my fav file')

      let statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).not.toBeUndefined()
    })

    it('commits the staged changes', async () => {
      await stageFile(repoPath, newFileName)
      await gitStore.loadFromGit()

      await viewModel.commit('hey there')

      const statuses = await gitService.getStatuses()
      expect(statuses[newFileName]).toBeUndefined()
    })

    it("throws an error if there's no commit message", async () => {
      let error = null
      try {
        await viewModel.commit('')
      } catch (e) {
        error = e
      }

      expect(error).not.toBe(null)
      expect(error.name).toBe(CommitBoxViewModel.NoMessageErrorName())
    })

    it('throws an error if there are no staged changes', async () => {
      let error = null
      try {
        await viewModel.commit('hey there')
      } catch (e) {
        error = e
      }

      expect(error).not.toBe(null)
      expect(error.name).toBe(CommitBoxViewModel.NoStagedFilesErrorName())
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
