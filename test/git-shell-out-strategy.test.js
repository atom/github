/** @babel */

import fs from 'fs'
import path from 'path'

import GitShellOutStrategy from '../lib/git-shell-out-strategy'

import {copyRepositoryDir, assertDeepPropertyVals} from './helpers'

/**
 * KU Thoughts: The GitShellOutStrategy methods are tested in Repository tests for the most part
 *  For now, in order to minimize duplication, I'll limit test coverage here to methods that produce
 *  output that we rely on, to serve as documentation
 */

describe('Git commands', () => {
  describe('diffFileStatus', () => {
    it('returns an object with working directory file diff status between relative to HEAD', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const git = new GitShellOutStrategy(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const diffOutput = await git.diffFileStatus({ target: 'HEAD' })
      assert.deepEqual(diffOutput, {
        'a.txt': 'modified',
        'b.txt': 'removed',
        'c.txt': 'removed',
        'd.txt': 'added',
        'e.txt': 'added'
      })
    })

    it('returns an empty object if there are no added, modified, or removed files', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const git = new GitShellOutStrategy(workingDirPath)
      const diffOutput = await git.diffFileStatus({ target: 'HEAD' })
      assert.deepEqual(diffOutput, {})
    })
  })

  describe('getUntrackedFiles', () => {
    it('returns an array of untracked file paths', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const git = new GitShellOutStrategy(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'd.txt'), 'foo', 'utf8')
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'bar', 'utf8')
      fs.writeFileSync(path.join(workingDirPath, 'f.txt'), 'qux', 'utf8')
      assert.deepEqual(await git.getUntrackedFiles(), ['d.txt', 'e.txt', 'f.txt'])
    })
  })

  describe('diff', () => {
    it('returns an empty array if there are no modified, added, or deleted files', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const git = new GitShellOutStrategy(workingDirPath)

      const diffOutput = await git.diff()
      assert.deepEqual(diffOutput, [])
    })

    it('returns an array of objects for each file patch', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const git = new GitShellOutStrategy(workingDirPath)

      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      fs.writeFileSync(path.join(workingDirPath, 'f.txt'), 'cat', 'utf8')

      await git.stageFile('f.txt')
      const stagedDiffOutput = await git.diff({staged: true})
      assertDeepPropertyVals(stagedDiffOutput, [{
        'oldPath': null,
        'newPath': 'f.txt',
        'hunks': [
          {
            'oldStartLine': 0,
            'oldLineCount': 0,
            'newStartLine': 1,
            'newLineCount': 1,
            'lines': [ '+cat', '\\ No newline at end of file' ]
          }
        ],
        'status': 'added'
      }])

      const unstagedDiffOutput = await git.diff()
      assertDeepPropertyVals(unstagedDiffOutput, [
        {
          'oldPath': 'a.txt',
          'newPath': 'a.txt',
          'hunks': [
            {
              'oldStartLine': 1,
              'oldLineCount': 1,
              'newStartLine': 1,
              'newLineCount': 3,
              'lines': [
                '+qux',
                ' foo',
                '+bar'
              ]
            }
          ],
          'status': 'modified'
        },
        {
          'oldPath': 'b.txt',
          'newPath': null,
          'hunks': [
            {
              'oldStartLine': 1,
              'oldLineCount': 1,
              'newStartLine': 0,
              'newLineCount': 0,
              'lines': [
                '-bar'
              ]
            }
          ],
          'status': 'removed'
        },
        {
          'oldPath': 'c.txt',
          'newPath': null,
          'hunks': [
            {
              'oldStartLine': 1,
              'oldLineCount': 1,
              'newStartLine': 0,
              'newLineCount': 0,
              'lines': [ '-baz' ]
            }
          ],
          'status': 'removed'
        },
        {
          'oldPath': null,
          'newPath': 'd.txt',
          'hunks': [
            {
              'oldStartLine': 0,
              'oldLineCount': 0,
              'newStartLine': 1,
              'newLineCount': 1,
              'lines': [ '+baz' ]
            }
          ],
          'status': 'added'
        },
        {
          'oldPath': null,
          'newPath': 'e.txt',
          'hunks': [
            {
              'oldStartLine': 0,
              'oldLineCount': 0,
              'newStartLine': 1,
              'newLineCount': 1,
              'lines': [ '+qux', '\\ No newline at end of file' ]
            }
          ],
          'status': 'added'
        }
      ])
    })
  })
})
