/** @babel */

import {createDiffViewModel} from './git-helpers'

describe('FileDiff', function () {
  it('returns "partial" from getStageStatus() when some of the hunks are staged', async () => {
    const viewModel = await createDiffViewModel('src/config.coffee', 'dummy-atom')

    let fileDiff = viewModel.getFileDiffs()[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    fileDiff.getHunks()[1].stage()
    expect(fileDiff.getStageStatus()).toBe('partial')

    fileDiff.getHunks()[1].unstage()
    expect(fileDiff.getStageStatus()).toBe('unstaged')
  })
})
