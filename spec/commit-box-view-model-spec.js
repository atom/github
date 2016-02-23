/** @babel */

import GitService from '../lib/git-service'
import CommitBoxViewModel from '../lib/commit-box-view-model'
import {copyRepository} from './helpers'
import {waitsForPromise} from './async-spec-helpers'

describe('CommitBoxViewModel', () => {
  let viewModel

  beforeEach(() => {
    const repoPath = copyRepository()

    atom.project.setPaths([repoPath])

    viewModel = new CommitBoxViewModel(GitService.instance())
    waitsForPromise(() => viewModel.update())
  })

  describe('getBranchName', () => {
    it('is the current branch', () => {
      expect(viewModel.getBranchName()).toBe('master')
    })
  })
})
