/** @babel */

import BranchesViewModel from '../lib/branches-view-model'
import {createGitStore} from './helpers'

describe('BranchesViewModel', () => {
  let gitStore
  let viewModel

  beforeEach(async () => {
    gitStore = await createGitStore()
    viewModel = new BranchesViewModel(gitStore)
  })

  describe('name sanitization', () => {
    it('sanitizes the branch name', async () => {
      const sanitized = await viewModel.sanitizedBranchName("the people's glorious branch name")
      expect(sanitized).toBe("the-people's-glorious-branch-name")
    })
  })
})
