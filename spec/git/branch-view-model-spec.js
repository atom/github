/** @babel */

import BranchViewModel from '../../lib/git/branch/branch-view-model'
import {createGitStore} from './git-helpers'

describe('BranchViewModel', () => {
  let gitStore
  let viewModel

  beforeEach(async () => {
    gitStore = await createGitStore()
    viewModel = new BranchViewModel(gitStore)
  })

  describe('name sanitization', () => {
    it('sanitizes the branch name', async () => {
      const sanitized = await viewModel.sanitizedBranchName("the people's glorious branch name")
      expect(sanitized).toBe("the-people's-glorious-branch-name")
    })
  })
})
