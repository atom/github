/** @babel */

import GitShellOutStrategy from '../lib/git-shell-out-strategy'

import {copyRepositoryDir} from './helpers'

/**
 * KU Thoughts: The GitShellOutStrategy methods are tested in Repository tests for the most part
 *  For now, in order to minimize duplication, I'll limit test coverage here to methods that produce
 *  output that we rely on, to serve as documentation
 */

describe('Git commands', () => {
  describe('diffFileStatus', () => {
    it('returns an object with working directory file diff status between relative to HEAD', async () => {
      const workingDirPath = copyRepositoryDir('merge-conflict')
      const git = new GitShellOutStrategy(workingDirPath)
      const diffOutput = await git.diffFileStatus({ target: 'HEAD' })
      assert.deepEqual(diffOutput, {
        'added-to-both.txt': 'M',
        'modified-on-both-ours.txt': 'M',
        'modified-on-both-theirs.txt': 'M',
        'removed-on-master.txt': 'A'
      })
    })
  })
})
