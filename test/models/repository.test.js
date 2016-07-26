/** @babel */

import fs from 'fs'
import path from 'path'
import dedent from 'dedent-js'
import sinon from 'sinon'
import Git from 'nodegit'

import Repository from '../../lib/models/repository'

import {copyRepositoryDir, buildRepository, assertDeepPropertyVals, cloneRepository, createEmptyCommit} from '../helpers'

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

    it('allows to create a new transaction if the previous one throws an error', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      let executed = false
      try {
        await repo.transact(async () => { throw new Error('An error!') })
      } catch (e) { }
      await repo.transact(async () => { executed = true })
      assert(executed)
    })
  })

  describe('refreshing staged and unstaged changes', () => {
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

    it('creates a merge commit when a merge is in progress', async () => {
      const workingDirPath = copyRepositoryDir('in-progress-merge')
      const repository = await buildRepository(workingDirPath)
      const mergeBase = await repository.getLastCommit()
      const mergeHead = await repository.getMergeHead()
      await repository.commit('Merge Commit')
      const commit = await repository.getLastCommit()
      assert.equal(commit.message(), 'Merge Commit')
      assert.equal(commit.parents()[0].toString(), mergeBase.toString())
      assert.equal(commit.parents()[1].toString(), mergeHead.toString())
      assert.equal(await repository.isMerging(), false)
      assert.isNull(await repository.getMergeMessage())
      assert.deepEqual(await repository.getStagedChanges(), [])
      assert.deepEqual(await repository.getUnstagedChanges(), [])
    })

    it('throws an error when committing a merge that has conflicts', async () => {
      const workingDirPath = copyRepositoryDir('merge-conflict')
      const repository = await buildRepository(workingDirPath)
      const mergeBase = await repository.getLastCommit()
      try {
        await repository.commit('Merge Commit')
        assert(false, 'Repository.commit should have thrown an exception!')
      } catch (e) {
        assert.equal(e.code, 'ECONFLICT')
      }
      assert.equal((await repository.getLastCommit()).toString(), mergeBase.toString())
      assert.equal(await repository.isMerging(), true)
      assert.equal((await repository.getStagedChanges()).length, 0)
      assert.equal((await repository.getUnstagedChanges()).length, 0)
    })

    it('strips out comments', async () => {
      const workingDirPath = copyRepositoryDir('three-files')
      const repo = await buildRepository(workingDirPath)
      await repo.commit([
        "Merge branch 'branch'",
        "",
        "# Conflicts:",
        "#	added-to-both.txt",
        "#	modified-on-both-ours.txt",
        "#	modified-on-both-theirs.txt",
        "#	removed-on-branch.txt",
        "#	removed-on-master.txt"
      ].join('\n'))

      assert.deepEqual((await repo.getLastCommit()).message(), "Merge branch 'branch'")
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
    describe('refreshMergeConflicts()', () => {
      it('returns a promise resolving to an array of MergeConflict objects', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        let mergeConflicts = await repo.refreshMergeConflicts()

        const expected = [
          {
            path: 'added-to-both.txt',
            fileStatus: 'M',
            oursStatus: '+',
            theirsStatus: '+'
          },
          {
            path: 'modified-on-both-ours.txt',
            fileStatus: 'M',
            oursStatus: '*',
            theirsStatus: '*'
          },
          {
            path: 'modified-on-both-theirs.txt',
            fileStatus: 'M',
            oursStatus: '*',
            theirsStatus: '*'
          },
          {
            path: 'removed-on-branch.txt',
            fileStatus: 'E',
            oursStatus: '*',
            theirsStatus: '-'
          },
          {
            path: 'removed-on-master.txt',
            fileStatus: 'A',
            oursStatus: '-',
            theirsStatus: '*'
          }
        ]

        assertDeepPropertyVals(mergeConflicts, expected)

        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'))
        mergeConflicts = await repo.refreshMergeConflicts()

        expected[3].fileStatus = 'D'
        assertDeepPropertyVals(mergeConflicts, expected)
      })

      it('reuses the same MergeConflict objects if they are equivalent', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        const mergeConflicts1 = await repo.refreshMergeConflicts()

        await repo.addPathToIndex('removed-on-master.txt')
        const mergeConflicts2 = await repo.refreshMergeConflicts()

        assert.equal(mergeConflicts1.length, 5)
        assert.equal(mergeConflicts2.length, 4)
        assert.equal(mergeConflicts1[0], mergeConflicts2[0])
        assert.equal(mergeConflicts1[1], mergeConflicts2[1])
        assert.equal(mergeConflicts1[2], mergeConflicts2[2])
        assert.equal(mergeConflicts1[3], mergeConflicts2[3])
        assert(mergeConflicts1[4].isDestroyed())
      })

      it('returns an empty arry if the repo has no merge conflicts', async () => {
        const workingDirPath = copyRepositoryDir('three-files')
        const repo = await buildRepository(workingDirPath)

        const mergeConflicts = await repo.getMergeConflicts()
        assert.deepEqual(mergeConflicts, [])
      })
    })

    describe('addPathToIndex(path)', () => {
      it('updates the staged changes accordingly', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)

        const mergeConflictPaths = (await repo.getMergeConflicts()).map(c => c.getPath())
        assert.deepEqual(mergeConflictPaths, ['added-to-both.txt', 'modified-on-both-ours.txt', 'modified-on-both-theirs.txt', 'removed-on-branch.txt', 'removed-on-master.txt'])

        let stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), [])

        await repo.addPathToIndex('added-to-both.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), ['added-to-both.txt'])

        // choose version of the file on head
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'master modification\n', 'utf8')
        await repo.addPathToIndex('modified-on-both-ours.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), ['added-to-both.txt'])

        // choose version of the file on branch
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'branch modification\n', 'utf8')
        await repo.addPathToIndex('modified-on-both-ours.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), ['added-to-both.txt', 'modified-on-both-ours.txt'])

        // remove file that was deleted on branch
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'))
        await repo.addPathToIndex('removed-on-branch.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt'])

        // remove file that was deleted on master
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-master.txt'))
        await repo.addPathToIndex('removed-on-master.txt')
        stagedFilePatches = await repo.refreshStagedChanges()
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.getDescriptionPath()), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt'])
      })
    })

    describe('pathHasMergeMarkers()', () => {
      it('returns true if and only if the file has merge markers', async () => {
        const workingDirPath = copyRepositoryDir('merge-conflict')
        const repo = await buildRepository(workingDirPath)

        assert.isTrue(await repo.pathHasMergeMarkers('added-to-both.txt'))
        assert.isFalse(await repo.pathHasMergeMarkers('removed-on-master.txt'))

        fs.writeFileSync(path.join(workingDirPath, 'file-with-chevrons.txt'), dedent`
          no branch name:
          >>>>>>>
          <<<<<<<

          not enough chevrons:
          >>> HEAD
          <<< branch

          too many chevrons:
          >>>>>>>>> HEAD
          <<<<<<<<< branch

          too many words after chevrons:
          >>>>>>> blah blah blah
          <<<<<<< blah blah blah

          not at line beginning:
          foo >>>>>>> bar
          baz <<<<<<< qux
        `)
        assert.isFalse(await repo.pathHasMergeMarkers('file-with-chevrons.txt'))

        assert.isFalse(await repo.pathHasMergeMarkers('nonexistent-file.txt'))
      })
    })

    describe('abortMerge()', () => {
      describe('when the working directory is clean', () => {
        it('resets the index and the working directory to match HEAD', async () => {
          const workingDirPath = copyRepositoryDir('merge-conflict-abort')
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
          const workingDirPath = copyRepositoryDir('merge-conflict-abort')
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
          const workingDirPath = copyRepositoryDir('merge-conflict-abort')
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
