/** @babel */

import fs from 'fs'
import path from 'path'
import {copyRepositoryDir, buildRepository, assertDeepPropertyVals} from './helpers'

describe('Repository', () => {
  describe('getUnstagedChanges()', () => {
    it('returns a promise resolving to an array of FileDiff objects', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)
      const fileDiffs = await repo.getUnstagedChanges()

      assertDeepPropertyVals(fileDiffs, [
        {
          oldName: 'a.txt',
          newName: 'a.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: 'foo', oldLineNumber: 1, newLineNumber: 2},
                {status: 'added', text: 'bar', oldLineNumber: -1, newLineNumber: 3}
              ]
            }
          ]
        },
        {
          oldName: 'b.txt',
          newName: 'b.txt',
          status: 'removed',
          hunks: [
            {
              lines: [
                {status: 'removed', text: 'bar', oldLineNumber: 1, newLineNumber: -1},
              ]
            }
          ]
        },
        {
          oldName: 'c.txt',
          newName: 'd.txt',
          status: 'renamed',
          hunks: []
        },
        {
          oldName: 'e.txt',
          newName: 'e.txt',
          status: 'added',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: '\n\\ No newline at end of file', oldLineNumber: -1, newLineNumber: 1}
              ]
            }
          ]
        }
      ])
    })
  })

  describe('stageFileDiff()', () => {
    it('can stage file modifications', () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [modifyDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(modifyDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [
        {
          oldName: 'a.txt',
          newName: 'a.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: 'foo', oldLineNumber: 1, newLineNumber: 2},
                {status: 'added', text: 'bar', oldLineNumber: -1, newLineNumber: 3}
              ]
            }
          ]
        }
      ])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })
  })
})
