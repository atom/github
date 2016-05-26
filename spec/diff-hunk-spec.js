/** @babel */

import {createDiffViewModel} from './helpers'

describe('DiffHunk', function () {
  let diffHunk
  beforeEach(async () => {
    const viewModel = await createDiffViewModel('src/config.coffee', 'dummy-atom')
    diffHunk = viewModel.getFileDiff().getHunks()[0]
  })

  it('stages all lines with ::stage() and unstages all lines with ::unstage()', function () {
    expect(diffHunk.getStageStatus()).toBe('unstaged')

    diffHunk.stage()
    expect(diffHunk.getStageStatus()).toBe('staged')
    expect(diffHunk.getLines()[3].isStaged()).toBe(true)
    expect(diffHunk.getLines()[4].isStaged()).toBe(true)
    expect(diffHunk.getLines()[5].isStaged()).toBe(true)

    diffHunk.unstage()
    expect(diffHunk.getStageStatus()).toBe('unstaged')
    expect(diffHunk.getLines()[3].isStaged()).toBe(false)
    expect(diffHunk.getLines()[4].isStaged()).toBe(false)
    expect(diffHunk.getLines()[5].isStaged()).toBe(false)
  })

  it('returns "partial" from getStageStatus() when some of the lines are staged', function () {
    expect(diffHunk.getStageStatus()).toBe('unstaged')

    diffHunk.getLines()[3].stage()
    expect(diffHunk.getStageStatus()).toBe('partial')

    diffHunk.getLines()[3].unstage()
    expect(diffHunk.getStageStatus()).toBe('unstaged')
  })
})
