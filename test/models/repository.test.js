/** @babel */

import fs from 'fs'
import path from 'path'
import dedent from 'dedent-js'
import sinon from 'sinon'

import {cloneRepository, buildRepository, assertDeepPropertyVals, setUpLocalAndRemoteRepositories, getHeadCommitOnRemote} from '../helpers'

describe('Repository', function () {
  describe('getting staged and unstaged changes', () => {
    it('returns a promise resolving to an array of FilePatch objects', async () => {
      const workingDirPath = await cloneRepository('three-files')
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
          newPath: null,
          status: 'deleted',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'bar', oldLineNumber: 1, newLineNumber: -1}
              ]
            }
          ]
        },
        {
          oldPath: 'c.txt',
          newPath: null,
          status: 'deleted',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'baz', oldLineNumber: 1, newLineNumber: -1}
              ]
            }
          ]
        },
        {
          oldPath: null,
          newPath: 'd.txt',
          status: 'added',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'baz', oldLineNumber: -1, newLineNumber: 1}
              ]
            }
          ]
        },
        {
          oldPath: null,
          newPath: 'e.txt',
          status: 'added',
          hunks: [
            {
              lines: [
                {status: 'added', text: 'qux', oldLineNumber: -1, newLineNumber: 1},
                {status: undefined, text: '\\ No newline at end of file', oldLineNumber: -1, newLineNumber: 1}
              ]
            }
          ]
        }
      ])
    })

    it('reuses the same FilePatch objects if they are equivalent', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar', 'utf8')
      fs.unlinkSync(path.join(workingDirPath, 'b.txt'))
      fs.writeFileSync(path.join(workingDirPath, 'c.txt'), 'bar\nbaz')
      fs.writeFileSync(path.join(workingDirPath, 'd.txt'), 'qux', 'utf8')
      await repo.refresh()
      const unstagedFilePatches1 = await repo.getUnstagedChanges()

      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'baz\nfoo\nqux', 'utf8')
      fs.writeFileSync(path.join(workingDirPath, 'c.txt'), 'baz')
      fs.unlinkSync(path.join(workingDirPath, 'd.txt'))
      await repo.refresh()
      const unstagedFilePatches2 = await repo.getUnstagedChanges()

      assert.equal(unstagedFilePatches1.length, 4)
      assert.equal(unstagedFilePatches2.length, 3)
      assert.equal(unstagedFilePatches1[0], unstagedFilePatches2[0])
      assert.equal(unstagedFilePatches1[1], unstagedFilePatches2[1])
      assert.equal(unstagedFilePatches1[2], unstagedFilePatches2[2])
      assert(unstagedFilePatches1[3].isDestroyed())

      await repo.stageFiles([unstagedFilePatches2[0].getPath()])
      await repo.stageFiles([unstagedFilePatches2[1].getPath()])
      await repo.stageFiles([unstagedFilePatches2[2].getPath()])
      const stagedFilePatches1 = await repo.getStagedChanges()

      await repo.unstageFiles([stagedFilePatches1[2].getPath()])
      const stagedFilePatches2 = await repo.getStagedChanges()
      const unstagedFilePatches3 = await repo.getUnstagedChanges()

      assert.equal(stagedFilePatches1.length, 3)
      assert.equal(stagedFilePatches2.length, 2)
      assert.equal(unstagedFilePatches3.length, 1)
      assert.equal(stagedFilePatches1[0], stagedFilePatches2[0])
      assert.equal(stagedFilePatches1[1], stagedFilePatches2[1])
      assert.notEqual(stagedFilePatches1[2], unstagedFilePatches3[0])
      assert(stagedFilePatches1[2].isDestroyed())
    })
  })

  describe('staging and unstaging files', () => {
    it('can stage and unstage modified files', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [patch] = await repo.getUnstagedChanges()
      const filePath = patch.getPath()

      await repo.stageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
      assert.deepEqual(await repo.getStagedChanges(), [patch])

      await repo.unstageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [patch])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage removed files', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.unlinkSync(path.join(workingDirPath, 'subdir-1', 'b.txt'))
      const [patch] = await repo.getUnstagedChanges()
      const filePath = patch.getPath()

      await repo.stageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
      assert.deepEqual(await repo.getStagedChanges(), [patch])

      await repo.unstageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [patch])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage renamed files', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'subdir-1', 'd.txt'))
      const patches = await repo.getUnstagedChanges()
      const filePath1 = patches[0].getPath()
      const filePath2 = patches[1].getPath()

      await repo.stageFiles([filePath1])
      await repo.stageFiles([filePath2])
      assert.deepEqual(await repo.getStagedChanges(), patches)
      assert.deepEqual(await repo.getUnstagedChanges(), [])

      await repo.unstageFiles([filePath1])
      await repo.unstageFiles([filePath2])
      assert.deepEqual(await repo.getUnstagedChanges(), patches)
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can stage and unstage added files', async () => {
      const workingDirPath = await cloneRepository('three-files')
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'e.txt'), 'qux', 'utf8')
      const repo = await buildRepository(workingDirPath)
      const [patch] = await repo.getUnstagedChanges()
      const filePath = patch.getPath()

      await repo.stageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
      assert.deepEqual(await repo.getStagedChanges(), [patch])

      await repo.unstageFiles([filePath])
      assert.deepEqual(await repo.getUnstagedChanges(), [patch])
      assert.deepEqual(await repo.getStagedChanges(), [])
    })

    it('can unstage and retrieve staged changes relative to HEAD~', async () => {
      const workingDirPath = await cloneRepository('multiple-commits')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'file.txt'), 'three\nfour\n', 'utf8')
      assertDeepPropertyVals(await repo.getStagedChangesSinceParentCommit(), [
        {
          oldPath: 'file.txt',
          newPath: 'file.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'two', oldLineNumber: 1, newLineNumber: -1},
                {status: 'added', text: 'three', oldLineNumber: -1, newLineNumber: 1},
              ]
            }
          ]
        }
      ])

      await repo.stageFiles(['file.txt'])
      assertDeepPropertyVals(await repo.getStagedChangesSinceParentCommit(), [
        {
          oldPath: 'file.txt',
          newPath: 'file.txt',
          status: 'modified',
          hunks: [
            {
              lines: [
                {status: 'deleted', text: 'two', oldLineNumber: 1, newLineNumber: -1},
                {status: 'added', text: 'three', oldLineNumber: -1, newLineNumber: 1},
                {status: 'added', text: 'four', oldLineNumber: -1, newLineNumber: 2},
              ]
            }
          ]
        }
      ])

      await repo.stageFilesFromParentCommit(['file.txt'])
      assert.deepEqual(await repo.getStagedChangesSinceParentCommit(), [])
    })
  })

  describe('applyPatchToIndex', () => {
    it('can stage and unstage modified files', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedPatch1] = (await repo.getUnstagedChanges()).map(p => p.copy())

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refresh()
      await repo.getUnstagedChanges()
      const [unstagedPatch2] = (await repo.getUnstagedChanges()).map(p => p.copy())

      await repo.applyPatchToIndex(unstagedPatch1)
      assertDeepPropertyVals(await repo.getStagedChanges(), [unstagedPatch1])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.applyPatchToIndex(unstagedPatch1.getUnstagePatch())
      assert.deepEqual(await repo.getStagedChanges(), [])
      assertDeepPropertyVals(await repo.getUnstagedChanges(), [unstagedPatch2])
    })

    it('emits update events on file patches that change as a result of staging', async () => {
      const workdirPath = await cloneRepository('multi-line-file')
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
      await repository.refresh()

      const [unstagedFilePatch] = await repository.getUnstagedChanges()
      const unstagedListener = sinon.spy()
      unstagedFilePatch.onDidUpdate(unstagedListener)

      await repository.applyPatchToIndex(unstagedFilePatch.getStagePatchForHunk(unstagedFilePatch.getHunks()[1]))
      assert.equal(unstagedListener.callCount, 1)

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
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)
      assert.equal((await repo.getLastCommit()).message, 'Initial commit')

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      const [unstagedPatch1] = (await repo.getUnstagedChanges()).map(p => p.copy())
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8')
      await repo.refresh()
      await repo.applyPatchToIndex(unstagedPatch1)
      await repo.commit('Commit 1')
      assert.equal((await repo.getLastCommit()).message, 'Commit 1')
      await repo.refresh()
      assert.deepEqual(await repo.getStagedChanges(), [])
      const unstagedChanges = await repo.getUnstagedChanges()
      assert.equal(unstagedChanges.length, 1)

      await repo.applyPatchToIndex(unstagedChanges[0])
      await repo.commit('Commit 2')
      assert.equal((await repo.getLastCommit()).message, 'Commit 2')
      await repo.refresh()
      assert.deepEqual(await repo.getStagedChanges(), [])
      assert.deepEqual(await repo.getUnstagedChanges(), [])
    })

    it('amends the last commit when the amend option is set to true', async () => {
      const workingDirPath = await cloneRepository('multiple-commits')
      const repo = await buildRepository(workingDirPath)
      const lastCommit = await repo.git.getHeadCommit()
      const lastCommitParent = await repo.git.getCommit('HEAD~')
      await repo.commit('amend last commit', {amend: true, allowEmpty: true})
      const amendedCommit = await repo.git.getHeadCommit()
      const amendedCommitParent = await repo.git.getCommit('HEAD~')
      assert.notDeepEqual(lastCommit, amendedCommit)
      assert.deepEqual(lastCommitParent, amendedCommitParent)
    })

    it('throws an error when there are unmerged files', async () => {
      const workingDirPath = await cloneRepository('merge-conflict')
      const repository = await buildRepository(workingDirPath)
      try {
        await repository.git.merge('origin/branch')
      } catch (e) {
        // expected
      }

      assert.equal(await repository.isMerging(), true)
      const mergeBase = await repository.getLastCommit()

      try {
        await repository.commit('Merge Commit')
      } catch (e) {
        assert.isAbove(e.code, 0)
        assert.match(e.command, /^git commit/)
      }

      assert.equal(await repository.isMerging(), true)
      assert.equal((await repository.getLastCommit()).toString(), mergeBase.toString())
    })

    it('wraps the commit message at 72 characters', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      await repo.stageFiles([path.join('subdir-1', 'a.txt')])
      await repo.commit([
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
        '',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      ].join('\n'))

      const message = (await repo.getLastCommit()).message
      assert.deepEqual(message.split('\n'), [
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod',
        'tempor',
        '',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi',
        'ut aliquip ex ea commodo consequat.'
      ])
    })

    it('strips out comments', async () => {
      const workingDirPath = await cloneRepository('three-files')
      const repo = await buildRepository(workingDirPath)

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8')
      await repo.stageFiles([path.join('subdir-1', 'a.txt')])
      await repo.commit([
        'Make a commit',
        '',
        '# Comments:',
        '#	blah blah blah',
        '#	other stuff'
      ].join('\n'))

      assert.deepEqual((await repo.getLastCommit()).message, 'Make a commit')
    })
  })

  describe('fetch(branchName)', () => {
    it('brings commits from the remote and updates remote branch, and does not update branch', async () => {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true})
      const localRepo = await buildRepository(localRepoPath)
      let remoteHead, localHead
      remoteHead = await localRepo.git.getCommit('origin/master')
      localHead = await localRepo.git.getCommit('master')
      assert.equal(remoteHead.message, 'second commit')
      assert.equal(localHead.message, 'second commit')

      await localRepo.fetch('master')
      remoteHead = await localRepo.git.getCommit('origin/master')
      localHead = await localRepo.git.getCommit('master')
      assert.equal(remoteHead.message, 'third commit')
      assert.equal(localHead.message, 'second commit')
    })
  })

  describe('pull()', () => {
    it('updates the remote branch and merges into local branch', async () => {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true})
      const localRepo = await buildRepository(localRepoPath)
      let remoteHead, localHead
      remoteHead = await localRepo.git.getCommit('origin/master')
      localHead = await localRepo.git.getCommit('master')
      assert.equal(remoteHead.message, 'second commit')
      assert.equal(localHead.message, 'second commit')

      await localRepo.pull('master')
      remoteHead = await localRepo.git.getCommit('origin/master')
      localHead = await localRepo.git.getCommit('master')
      assert.equal(remoteHead.message, 'third commit')
      assert.equal(localHead.message, 'third commit')
    })
  })

  describe('push()', () => {
    it('sends commits to the remote and updates ', async () => {
      const {localRepoPath, remoteRepoPath} = await setUpLocalAndRemoteRepositories()
      const localRepo = await buildRepository(localRepoPath)

      let localHead, localRemoteHead, remoteHead
      localHead = await localRepo.git.getCommit('master')
      localRemoteHead = await localRepo.git.getCommit('origin/master')
      assert.deepEqual(localHead, localRemoteHead)

      await localRepo.commit('fourth commit', {allowEmpty: true})
      await localRepo.commit('fifth commit', {allowEmpty: true})
      localHead = await localRepo.git.getCommit('master')
      localRemoteHead = await localRepo.git.getCommit('origin/master')
      remoteHead = await getHeadCommitOnRemote(remoteRepoPath)
      assert.notDeepEqual(localHead, remoteHead)
      assert.equal(remoteHead.message, 'third commit')
      assert.deepEqual(remoteHead, localRemoteHead)

      await localRepo.push('master')
      localHead = await localRepo.git.getCommit('master')
      localRemoteHead = await localRepo.git.getCommit('origin/master')
      remoteHead = await getHeadCommitOnRemote(remoteRepoPath)
      assert.deepEqual(localHead, remoteHead)
      assert.equal(remoteHead.message, 'fifth commit')
      assert.deepEqual(remoteHead, localRemoteHead)
    })
  })

  describe('getAheadCount(branchName) and getBehindCount(branchName)', () => {
    it('returns the number of commits ahead and behind the remote', async () => {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true})
      const localRepo = await buildRepository(localRepoPath)

      assert.equal(await localRepo.getBehindCount('master'), 0)
      assert.equal(await localRepo.getAheadCount('master'), 0)
      await localRepo.fetch('master')
      assert.equal(await localRepo.getBehindCount('master'), 1)
      assert.equal(await localRepo.getAheadCount('master'), 0)
      await localRepo.commit('new commit', {allowEmpty: true})
      await localRepo.commit('another commit', {allowEmpty: true})
      assert.equal(await localRepo.getBehindCount('master'), 1)
      assert.equal(await localRepo.getAheadCount('master'), 2)
    })
  })

  describe('getRemote(branchName)', () => {
    it('returns the remote name associated to the supplied branch name, null if none exists', async () => {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true})
      const localRepo = await buildRepository(localRepoPath)

      assert.equal(await localRepo.getRemote('master'), 'origin')
      await localRepo.git.exec(['remote', 'rename', 'origin', 'foo'])
      assert.equal(await localRepo.getRemote('master'), 'foo')

      await localRepo.git.exec(['remote', 'rm', 'foo'])
      assert.isNull(await localRepo.getRemote('master'))
    })
  })

  describe('merge conflicts', () => {
    describe('getMergeConflicts()', () => {
      it('returns a promise resolving to an array of MergeConflict objects', async () => {
        const workingDirPath = await cloneRepository('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        try {
          await repo.git.merge('origin/branch')
        } catch (e) {
          // expected
        }

        await repo.refresh()
        let mergeConflicts = await repo.getMergeConflicts()
        const expected = [
          {
            path: 'added-to-both.txt',
            fileStatus: 'modified',
            oursStatus: 'added',
            theirsStatus: 'added'
          },
          {
            path: 'modified-on-both-ours.txt',
            fileStatus: 'modified',
            oursStatus: 'modified',
            theirsStatus: 'modified'
          },
          {
            path: 'modified-on-both-theirs.txt',
            fileStatus: 'modified',
            oursStatus: 'modified',
            theirsStatus: 'modified'
          },
          {
            path: 'removed-on-branch.txt',
            fileStatus: 'equivalent',
            oursStatus: 'modified',
            theirsStatus: 'deleted'
          },
          {
            path: 'removed-on-master.txt',
            fileStatus: 'added',
            oursStatus: 'deleted',
            theirsStatus: 'modified'
          }
        ]

        assertDeepPropertyVals(mergeConflicts, expected)

        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'))
        await repo.refresh()
        mergeConflicts = await repo.getMergeConflicts()

        expected[3].fileStatus = 'deleted'
        assertDeepPropertyVals(mergeConflicts, expected)
      })

      it('reuses the same MergeConflict objects if they are equivalent', async () => {
        const workingDirPath = await cloneRepository('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        try {
          await repo.git.merge('origin/branch')
        } catch (e) {
          // expected
        }

        await repo.refresh()
        const mergeConflicts1 = await repo.getMergeConflicts()

        await repo.stageFiles(['removed-on-master.txt'])
        const mergeConflicts2 = await repo.getMergeConflicts()

        assert.equal(mergeConflicts1.length, 5)
        assert.equal(mergeConflicts2.length, 4)
        assert.equal(mergeConflicts1[0], mergeConflicts2[0])
        assert.equal(mergeConflicts1[1], mergeConflicts2[1])
        assert.equal(mergeConflicts1[2], mergeConflicts2[2])
        assert.equal(mergeConflicts1[3], mergeConflicts2[3])
        assert(mergeConflicts1[4].isDestroyed())
      })

      it('returns an empty arry if the repo has no merge conflicts', async () => {
        const workingDirPath = await cloneRepository('three-files')
        const repo = await buildRepository(workingDirPath)

        const mergeConflicts = await repo.getMergeConflicts()
        assert.deepEqual(mergeConflicts, [])
      })
    })

    describe('stageFiles([path])', () => {
      it('updates the staged changes accordingly', async () => {
        const workingDirPath = await cloneRepository('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        try {
          await repo.git.merge('origin/branch')
        } catch (e) {
          // expected
        }

        await repo.refresh()
        const mergeConflictPaths = (await repo.getMergeConflicts()).map(c => c.getPath())
        assert.deepEqual(mergeConflictPaths, ['added-to-both.txt', 'modified-on-both-ours.txt', 'modified-on-both-theirs.txt', 'removed-on-branch.txt', 'removed-on-master.txt'])

        let stagedFilePatches = await repo.getStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), [])

        await repo.stageFiles(['added-to-both.txt'])
        stagedFilePatches = await repo.getStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), ['added-to-both.txt'])

        // choose version of the file on head
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'master modification\n', 'utf8')
        await repo.stageFiles(['modified-on-both-ours.txt'])
        stagedFilePatches = await repo.getStagedChanges()
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), ['added-to-both.txt'])

        // choose version of the file on branch
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'branch modification\n', 'utf8')
        await repo.stageFiles(['modified-on-both-ours.txt'])
        stagedFilePatches = await repo.getStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), ['added-to-both.txt', 'modified-on-both-ours.txt'])

        // remove file that was deleted on branch
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'))
        await repo.stageFiles(['removed-on-branch.txt'])
        stagedFilePatches = await repo.getStagedChanges()
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt'])

        // remove file that was deleted on master
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-master.txt'))
        await repo.stageFiles(['removed-on-master.txt'])
        stagedFilePatches = await repo.getStagedChanges()
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.getPath()), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt'])
      })
    })

    describe('pathHasMergeMarkers()', () => {
      it('returns true if and only if the file has merge markers', async () => {
        const workingDirPath = await cloneRepository('merge-conflict')
        const repo = await buildRepository(workingDirPath)
        try {
          await repo.git.merge('origin/branch')
        } catch (e) {
          // expected
        }

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
          const workingDirPath = await cloneRepository('merge-conflict-abort')
          const repo = await buildRepository(workingDirPath)
          try {
            await repo.git.merge('origin/spanish')
          } catch (e) {
            // expected
          }
          assert.equal(await repo.isMerging(), true)
          await repo.abortMerge()
          assert.equal(await repo.isMerging(), false)
        })
      })

      describe('when a dirty file in the working directory is NOT under conflict', () => {
        it('successfully aborts the merge and does not affect the dirty file', async () => {
          const workingDirPath = await cloneRepository('merge-conflict-abort')
          const repo = await buildRepository(workingDirPath)
          try {
            await repo.git.merge('origin/spanish')
          } catch (e) {
            // expected
          }

          fs.writeFileSync(path.join(workingDirPath, 'fruit.txt'), 'a change\n')
          assert.equal(await repo.isMerging(), true)

          await repo.abortMerge()
          assert.equal(await repo.isMerging(), false)
          assert.equal((await repo.getStagedChanges()).length, 0)
          assert.equal((await repo.getUnstagedChanges()).length, 1)
          assert.equal(fs.readFileSync(path.join(workingDirPath, 'fruit.txt')), 'a change\n')
        })
      })

      describe('when a dirty file in the working directory is under conflict', () => {
        it('throws an error indicating that the abort could not be completed', async () => {
          const workingDirPath = await cloneRepository('merge-conflict-abort')
          const repo = await buildRepository(workingDirPath)
          try {
            await repo.git.merge('origin/spanish')
          } catch (e) {
            // expected
          }

          fs.writeFileSync(path.join(workingDirPath, 'animal.txt'), 'a change\n')
          const stagedChanges = await repo.getStagedChanges()
          const unstagedChanges = await repo.getUnstagedChanges()

          assert.equal(await repo.isMerging(), true)
          try {
            await repo.abortMerge()
            assert(false)
          } catch (e) {
            assert.match(e.command, /^git merge --abort/)
          }
          assert.equal(await repo.isMerging(), true)
          assert.deepEqual(await repo.getStagedChanges(), stagedChanges)
          assert.deepEqual(await repo.getUnstagedChanges(), unstagedChanges)
        })
      })
    })
  })
})
