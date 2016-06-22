/** @babel */

import fs from 'fs'
import path from 'path'
import {copyRepositoryDir, buildRepository, assertDeepPropertyVals} from './helpers'

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

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
          oldMode: Git.TreeEntry.FILEMODE.BLOB,
          newMode: Git.TreeEntry.FILEMODE.BLOB,
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
          oldMode: Git.TreeEntry.FILEMODE.BLOB,
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
          oldMode: Git.TreeEntry.FILEMODE.BLOB,
          newMode: Git.TreeEntry.FILEMODE.BLOB,
          status: 'renamed',
          hunks: []
        },
        {
          oldPath: 'e.txt',
          newPath: 'e.txt',
          oldMode: 0,
          newMode: Git.TreeEntry.FILEMODE.BLOB,
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

  describe('staging and unstaging file diffs', () => {
    it('can stage and unstage modified files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedDiff1] = await repo.getUnstagedChanges()

      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refreshUnstagedChanges()
      const [unstagedDiff2] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(unstagedDiff1)

      assertDeepPropertyVals(await repo.getStagedChanges(), [unstagedDiff1])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.unstageFileDiff(unstagedDiff1)
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [unstagedDiff2])
    })

    it('can stage and unstage removed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      const [removeDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(removeDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [removeDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.unstageFileDiff(removeDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [removeDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage renamed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      const [renameDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(renameDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [renameDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.unstageFileDiff(renameDiff)
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [renameDiff])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage added files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const repo = await buildRepository(workingDirPath)
      const [addedDiff] = await repo.getUnstagedChanges()

      await repo.stageFileDiff(addedDiff)

      assertDeepPropertyVals(await repo.getStagedChanges(), [addedDiff])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.unstageFileDiff(addedDiff)
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedDiff])
    })

    it('can stage and unstage changes when the repository is empty', async () => {
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
