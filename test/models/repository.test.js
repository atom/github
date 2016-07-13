/** @babel */

import {GitRepositoryAsync} from 'atom'
import fs from 'fs'
import path from 'path'
import sinon from 'sinon'

import {copyRepositoryDir, buildRepository, assertDeepPropertyVals, cloneRepository, createEmptyCommit} from '../helpers'

const Git = GitRepositoryAsync.Git

describe('Repository', () => {
  describe('transact', () => {
    it('serializes critical sections', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)

      const transactionPromises = []
      const actualEvents = []
      const expectedEvents = []
      for (let i = 0; i < 10; i++) {
        expectedEvents.push(i)
        transactionPromises.push(repo.transact(async function () {
          await repo.refresh()
          await new Promise(function (resolve) { window.setTimeout(resolve, Math.random() * 10)})
          await repo.refresh()
          actualEvents.push(i)
        }))
      }

      await Promise.all(transactionPromises)

      assert.deepEqual(actualEvents, expectedEvents)
    })

    it('does not allow transactions to nest', async function () {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      await repo.transact(function () {
        assert.throws(() => repo.transact(), /Nested transaction/)
      })
    })
  })

  describe('refreshing', () => {
    it('returns a promise resolving to an array of FilePatch objects', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')

      const repo = await buildRepository(workingDirPath)
      const filePatches = await repo.refreshUnstagedChanges()

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
          newPath: null,
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
          oldPath: null,
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

    it('reuses the same FilePatch objects if they are equivalent', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8')
      const unstagedFilePatches1 = await repo.refreshUnstagedChanges()

      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'baz\nfoo\nqux\n', 'utf8')
      fs.renameSync(path.join(workingDirPath, 'd.txt'), path.join(workingDirPath, 'z.txt'))
      fs.unlinkSync(path.join(workingDirPath, 'e.txt'))
      const unstagedFilePatches2 = await repo.refreshUnstagedChanges()

      assert.equal(unstagedFilePatches1.length, 4)
      assert.equal(unstagedFilePatches2.length, 3)
      assert.equal(unstagedFilePatches1[0], unstagedFilePatches2[0])
      assert.equal(unstagedFilePatches1[1], unstagedFilePatches2[1])
      assert.notEqual(unstagedFilePatches1[2], unstagedFilePatches2[2])
      assert(unstagedFilePatches1[3].isDestroyed())

      await repo.applyPatchToIndex(unstagedFilePatches2[0])
      await repo.applyPatchToIndex(unstagedFilePatches2[1])
      await repo.applyPatchToIndex(unstagedFilePatches2[2])
      const stagedFilePatches1 = await repo.refreshStagedChanges()

      await repo.applyPatchToIndex(stagedFilePatches1[2].getUnstagePatch())
      const stagedFilePatches2 = await repo.refreshStagedChanges()
      const unstagedFilePatches3 = await repo.refreshUnstagedChanges()

      assert.equal(stagedFilePatches1.length, 3)
      assert.equal(stagedFilePatches2.length, 2)
      assert.equal(unstagedFilePatches3.length, 1)
      assert.equal(stagedFilePatches1[0], stagedFilePatches2[0])
      assert.equal(stagedFilePatches1[1], stagedFilePatches2[1])
      assert.notEqual(stagedFilePatches1[2], unstagedFilePatches3[0])
      assert(stagedFilePatches1[2].isDestroyed())
    })
  })

  describe('applyPatchToIndex', () => {
    it('can stage and unstage modified files', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedPatch1] = (await repo.getUnstagedChanges()).map(p => p.copy())

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refreshUnstagedChanges()
      const [unstagedPatch2] = (await repo.getUnstagedChanges()).map(p => p.copy())

      await repo.applyPatchToIndex(unstagedPatch1)
      assertDeepPropertyVals(await repo.getStagedChanges(), [unstagedPatch1])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.applyPatchToIndex(unstagedPatch1.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [unstagedPatch2])
    })

    it('can stage and unstage removed files', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
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
      const workingDirPath = copyRepositoryDir('three-files')
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
      const workingDirPath = copyRepositoryDir('three-files')
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
      const workingDirPath = copyRepositoryDir('no-head-commit')

      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'foo\n', 'utf8')
      const [addedPatchToStage] = await repo.getUnstagedChanges()
      await repo.applyPatchToIndex(addedPatchToStage)
      const [addedPatch] = await repo.getStagedChanges()

      await repo.applyPatchToIndex(addedPatch.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [addedPatch])
    })

    it('emits update events on file patches that change as a result of staging', async () => {
      const workdirPath = await copyRepositoryDir('multi-line-file')
      const repository = await buildRepository(workdirPath)
      const filePath = path.join(workdirPath, 'sample.js')
      const originalLines = fs.readFileSync(filePath, 'utf8').split('\n')
      const unstagedLines = originalLines.slice()
      unstagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line'
      )
      unstagedLines.splice(11, 2, 'this is a modified line')
      fs.writeFileSync(filePath, unstagedLines.join('\n'))
      const [unstagedFilePatch] = await repository.getUnstagedChanges()
      const unstagedListener = sinon.spy()
      unstagedFilePatch.onDidUpdate(unstagedListener)

      await repository.applyPatchToIndex(unstagedFilePatch.getStagePatchForHunk(unstagedFilePatch.getHunks()[1]))
      assert(unstagedListener.callCount, 1)

      const [stagedFilePatch] = await repository.getStagedChanges()
      const stagedListener = sinon.spy()
      stagedFilePatch.onDidUpdate(stagedListener)

      const unstagePatch = stagedFilePatch.getUnstagePatchForLines(new Set(stagedFilePatch.getHunks()[0].getLines().slice(4, 5)))
      await repository.applyPatchToIndex(unstagePatch)
      assert(stagedListener.callCount, 1)
      assert(unstagedListener.callCount, 2)
    })
  })

  describe('commit', () => {
    it('creates a commit that contains the staged changes', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      assert.equal((await repo.getLastCommit()).message(), 'Initial commit\n')

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedPatch1] = (await repo.getUnstagedChanges()).map(p => p.copy())
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refreshUnstagedChanges()
      const [unstagedPatch2] = (await repo.getUnstagedChanges()).map(p => p.copy())
      await repo.applyPatchToIndex(unstagedPatch1)
      await repo.commit('Commit 1')
      assert.equal((await repo.getLastCommit()).message(), 'Commit 1')
      assertDeepPropertyVals(await repo.getStagedChanges(), [])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.applyPatchToIndex(unstagedChanges[0])
      await repo.commit('Commit 2')
      assert.equal((await repo.getLastCommit()).message(), 'Commit 2')
      assert.deepEqual(await repo.getStagedChanges(), [])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })

    it('wraps the commit message at 72 characters', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      await repo.commit([
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      ].join('\n'))
      assert.deepEqual((await repo.getLastCommit()).message().split('\n'), [
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod ',
        'tempor',
        '',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ',
        'ut aliquip ex ea commodo consequat.'
      ])
    })
  })

  describe('pull()', () => {
    it('brings commits from the remote', async () => {
      const {localRepoPath, remoteRepoPath} = await cloneRepository()
      const localRepo = await buildRepository(localRepoPath)
      const remoteRepo = await Git.Repository.open(remoteRepoPath)

      await createEmptyCommit(remoteRepoPath, 'new remote commit')

      assert.notEqual((await remoteRepo.getMasterCommit()).message(), (await localRepo.getLastCommit()).message())

      await localRepo.pull('master')
      assert.equal((await remoteRepo.getMasterCommit()).message(), (await localRepo.getLastCommit()).message())
    })
  })

  describe('push()', () => {
    it('sends commits to the remote and updates ', async () => {
      const {localRepoPath, remoteRepoPath} = await cloneRepository()
      const localRepo = await buildRepository(localRepoPath)
      const remoteRepo = await Git.Repository.open(remoteRepoPath)

      fs.writeFileSync(path.join(localRepoPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedFilePatch] = await localRepo.getUnstagedChanges()
      await localRepo.applyPatchToIndex(unstagedFilePatch)
      await localRepo.commit('new local commit')

      assert.notEqual((await remoteRepo.getMasterCommit()).message(), (await localRepo.getLastCommit()).message())

      await localRepo.push('master')
      assert.equal((await remoteRepo.getMasterCommit()).message(), (await localRepo.getLastCommit()).message())
    })
  })

  describe('getAheadBehindCount(branchName)', () => {
    it('returns the number of commits ahead and behind the remote', async () => {
      const {localRepoPath, remoteRepoPath} = await cloneRepository()
      const localRepo = await buildRepository(localRepoPath)
      const remoteRepo = await Git.Repository.open(remoteRepoPath)

      await createEmptyCommit(remoteRepoPath, 'new remote commit')
      assert.equal((await remoteRepo.getMasterCommit()).message(), 'new remote commit')

      fs.writeFileSync(path.join(localRepoPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedFilePatch] = await localRepo.getUnstagedChanges()
      await localRepo.applyPatchToIndex(unstagedFilePatch)
      await localRepo.commit('new local commit')

      assert.equal((await localRepo.getLastCommit()).message(), 'new local commit')

      let {ahead, behind} = await localRepo.getAheadBehindCount('master')
      assert.equal(behind, 0)
      assert.equal(ahead, 1)

      await localRepo.fetch('master')
      const counts = await localRepo.getAheadBehindCount('master')
      ahead = counts.ahead
      behind = counts.behind
      assert.equal(behind, 1)
      assert.equal(ahead, 1)
    })
  })

  describe('getBranchRemoteName(branchName)', () => {
    it('returns the remote name associated to the supplied branch name', async () => {
      const {localRepoPath} = await cloneRepository()
      const repository = await buildRepository(localRepoPath)
      assert.equal(await repository.getBranchRemoteName('master'), 'origin')
    })

    it('returns null if there is no remote associated with the supplied branch name', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repository = await buildRepository(workingDirPath)
      assert.isNull(await repository.getBranchRemoteName('master'))
    })
  })

  describe('merge conflicts', () => {
    describe('getMergeConflictPaths()', () => {
      it('returns an array of paths to files with merge conflicts in alphabetical order', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)

        const mergeConflictPaths = await repo.getMergeConflictPaths()
        assert.deepEqual(mergeConflictPaths, ['color.txt', 'number.txt'])
      })

      it('returns an empty arry if the repo has no merge conflicts', async () => {
        const workingDirPath = copyRepositoryDir('three-files')
        const repo = await buildRepository(workingDirPath)

        const mergeConflictPaths = await repo.getMergeConflictPaths()
        assert.deepEqual(mergeConflictPaths, [])
      })
    })

    describe('stageResolvedPath()', () => {
      it('stages the file at the specified path once merge conflicts have been resolved', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)

        fs.writeFileSync(path.join(workingDirPath, 'number.txt'), 'dos', 'utf8')
        fs.writeFileSync(path.join(workingDirPath, 'color.txt'), 'azul', 'utf8')

        let stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getNewPath()), ['animal.txt'])

        await repo.stageResolvedPath('number.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getNewPath()), ['animal.txt', 'number.txt'])
        assert.deepEqual(await repo.getMergeConflictPaths(), ['color.txt'])

        await repo.stageResolvedPath('color.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getNewPath()), ['animal.txt', 'number.txt', 'color.txt'])
        assert.deepEqual(await repo.getMergeConflictPaths(), [])
      })
    })

    describe('abortMerge()', () => {
      describe('when the working directory is clean', () => {
        it('resets the index and the working directory to match HEAD', async () => {
          const workingDirPath = copyRepositoryDir('merge-conflict')
          const repo = await buildRepository(workingDirPath)
          assert.equal(await repo.isMerging(), true)
          assert.equal(await repo.hasMergeConflict(), true)

          await repo.abortMerge()
          assert.equal(await repo.isMerging(), false)
          assert.equal(await repo.hasMergeConflict(), false)
          assert.deepEqual(await repo.refreshStagedChanges(), [])
          assert.deepEqual(await repo.refreshUnstagedChanges(), [])
          assert.equal(fs.readFileSync(path.join(workingDirPath, 'color.txt'), 'utf8'), 'blue\n')
          assert.equal(fs.readFileSync(path.join(workingDirPath, 'number.txt'), 'utf8'), 'two\n')
        })
      })

      describe('when a dirty file in the working directory is NOT in the staging area', () => {
        it('throws an error indicating that the abort could not be completed', async () => {
          const workingDirPath = copyRepositoryDir('merge-conflict')
          const repo = await buildRepository(workingDirPath)
          fs.writeFileSync(path.join(workingDirPath, 'fruit.txt'), 'a change\n')
          assert.equal(await repo.isMerging(), true)
          assert.equal(await repo.hasMergeConflict(), true)

          await repo.abortMerge()
          assert.equal(await repo.isMerging(), false)
          assert.equal(await repo.hasMergeConflict(), false)
          assert.equal((await repo.refreshStagedChanges()).length, 0)
          assert.equal((await repo.refreshUnstagedChanges()).length, 1)
          assert.equal(fs.readFileSync(path.join(workingDirPath, 'fruit.txt')), 'a change\n')
        })
      })

      describe('when a dirty file in the working directory is in the staging area', () => {
        it('throws an error indicating that the abort could not be completed', async () => {
          const workingDirPath = copyRepositoryDir('merge-conflict')
          const repo = await buildRepository(workingDirPath)
          fs.writeFileSync(path.join(workingDirPath, 'animal.txt'), 'a change\n')
          const stagedChanges = await repo.refreshStagedChanges()
          const unstagedChanges = await repo.refreshUnstagedChanges()

          assert.equal(await repo.isMerging(), true)
          assert.equal(await repo.hasMergeConflict(), true)
          try {
            await repo.abortMerge()
            assert(false)
          } catch (e) {
            assert.equal(e.code, 'EDIRTYSTAGED')
            assert.equal(e.path, 'animal.txt')
          }
          assert.equal(await repo.isMerging(), true)
          assert.equal(await repo.hasMergeConflict(), true)
          assert.deepEqual(await repo.refreshStagedChanges(), stagedChanges)
          assert.deepEqual(await repo.refreshUnstagedChanges(), unstagedChanges)
        })
      })
    })
  })
})
