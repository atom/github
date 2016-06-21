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
          oldMode: 33188,
          newMode: 33188,
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux\n', oldLineNumber: -1, newLineNumber: 1},
                {status: 'unchanged', text: 'foo\n', oldLineNumber: 1, newLineNumber: 2},
                {status: 'added', text: 'bar\n', oldLineNumber: -1, newLineNumber: 3}
              ]
            }
          ]
        },
        {
          oldPath: 'b.txt',
          newPath: 'b.txt',
          oldMode: 33188,
          newMode: 0,
          status: 'removed',
          hunks: [
            {
              lines: [
                {status: 'removed', text: 'bar\n', oldLineNumber: 1, newLineNumber: -1}
              ]
            }
          ]
        },
        {
          oldPath: 'c.txt',
          newPath: 'd.txt',
          oldMode: 33188,
          newMode: 33188,
          status: 'renamed',
          hunks: []
        },
        {
          oldPath: 'e.txt',
          newPath: 'e.txt',
          oldMode: 0,
          newMode: 33188,
          status: 'added',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: undefined, text: '\n\\ No newline at end of file\n', oldLineNumber: -1, newLineNumber: 1}
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
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')

      await repo.stageFileDiff(modifyDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [modifyDiff])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)
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
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedDiff])
    })

    it('can unstage files when repo is empty', async () => {
      const workingDirPath = copyRepositoryDir(3)

      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'foo\n', 'utf8')
      const [addedDiffToStage] = await repo.getUnstagedChanges()
      await repo.stageFileDiff(addedDiffToStage)
      const [addedDiff] = await repo.getStagedChanges()

      await repo.unstageFileDiff(addedDiff)
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedDiff])
    })
  })
})
