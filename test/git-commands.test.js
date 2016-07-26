/** @babel */

import {diff} from '../lib/git-commands'

import {copyRepositoryDir} from './helpers'

describe('Git commands', () => {
  describe('diff', () => {
    describe('--name-status HEAD', () => {
      it('returns an object with working directory file diff status between relative to HEAD', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const diffOutput = await diff(['HEAD', '--name-status'], workingDirPath)
        assert.deepEqual(diffOutput, {
          'added-to-both.txt': 'M',
          'modified-on-both-ours.txt': 'M',
          'modified-on-both-theirs.txt': 'M',
          'removed-on-master.txt': 'A'
        })
      })
    })
  })
})
