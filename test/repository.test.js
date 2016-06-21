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
          oldPath: 'a.txt',
          newPath: 'a.txt',
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
          oldPath: 'b.txt',
          newPath: 'b.txt',
          status: 'removed',
          hunks: [
            {
              lines: [
                {status: 'removed', text: 'bar', oldLineNumber: 1, newLineNumber: -1}
              ]
            }
          ]
        },
        {
          oldPath: 'c.txt',
          newPath: 'd.txt',
          status: 'renamed',
          hunks: []
        },
        {
          oldPath: 'e.txt',
          newPath: 'e.txt',
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
    it('can stage file modifications', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [modifyDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(modifyDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [modifyDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })

    it('can stage removed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      const [removeDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(removeDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [removeDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })

    it('can stage renamed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      const [renameDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(renameDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [renameDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })

    it('can stage added files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const repo = await buildRepository(workingDirPath)
      const [addedDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(addedDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [addedDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })
  })

  describe('unstageFileDiff()', () => {
    it('can unstage modified files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [modifyDiff] = await repo.getUnstagedChanges()
      await repo.stageFileDiff(modifyDiff)

      await repo.unstageFileDiff(modifyDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [modifyDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can unstage removed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      const [removeDiff] = await repo.getUnstagedChanges()
      await repo.stageFileDiff(removeDiff)

      await repo.unstageFileDiff(removeDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [removeDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can unstage renamed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      const [renameDiff] = await repo.getUnstagedChanges()
      await repo.stageFileDiff(renameDiff)

      await repo.unstageFileDiff(renameDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [renameDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can unstage added files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const [addedDiffToStage] = await repo.getUnstagedChanges()
      await repo.stageFileDiff(addedDiffToStage)
      const [addedDiff] = await repo.getStagedChanges()

      await repo.unstageFileDiff(addedDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can unstage files when repo is empty', async () => {
      // TODO: implement me! create new empty repository? delete objects for current repo?
    })
  })
})
