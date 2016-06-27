/** @babel */

import fs from 'fs'
import path from 'path'
import {copyRepositoryDir, buildRepository, assertDeepPropertyVals} from '../helpers'

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

describe('Repository', () => {
  describe('getUnstagedChanges()', () => {
    it('returns a promise resolving to an array of FilePatch objects', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)
      const filePatches = await repo.getUnstagedChanges()

      assertDeepPropertyVals(filePatches, [
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

  describe('staging and unstaging file patches', () => {
    it('can stage and unstage modified files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedPatch1] = await repo.getUnstagedChanges()

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refreshUnstagedChanges()
      const [unstagedPatch2] = await repo.getUnstagedChanges()

      await repo.applyPatchToIndex(unstagedPatch1)
      assertDeepPropertyVals(await repo.getStagedChanges(), [unstagedPatch1])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.applyPatchToIndex(unstagedPatch1.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [unstagedPatch2])
    })

    it('can stage and unstage removed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.unlinkSync(path.join(workingDirPath, 'subdir-1', 'b.txt'))
      const [removePatch] = await repo.getUnstagedChanges()

      await repo.applyPatchToIndex(removePatch)
      assertDeepPropertyVals(await repo.getStagedChanges(), [removePatch])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.applyPatchToIndex(removePatch.getUnstagePatch())
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [removePatch])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage renamed files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      const repo = await buildRepository(workingDirPath)
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'subdir-1', 'd.txt'))
      const [renamePatch] = await repo.getUnstagedChanges()

      await repo.applyPatchToIndex(renamePatch)
      assertDeepPropertyVals(await repo.getStagedChanges(), [renamePatch])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.applyPatchToIndex(renamePatch.getUnstagePatch())
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [renamePatch])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage added files', async () => {
      const workingDirPath = copyRepositoryDir(1)
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'e.txt'), 'qux', 'utf8')
      const repo = await buildRepository(workingDirPath)
      const [addedPatch] = await repo.getUnstagedChanges()

      await repo.applyPatchToIndex(addedPatch)
      assertDeepPropertyVals(await repo.getStagedChanges(), [addedPatch])
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.applyPatchToIndex(addedPatch.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedPatch])
    })

    it('can stage and unstage changes when the repository has no HEAD commit', async () => {
      const workingDirPath = copyRepositoryDir(3)

      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'foo\n', 'utf8')
      const [addedPatchToStage] = await repo.getUnstagedChanges()
      await repo.applyPatchToIndex(addedPatchToStage)
      const [addedPatch] = await repo.getStagedChanges()

      await repo.applyPatchToIndex(addedPatch.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedPatch])
    })
  })
})
