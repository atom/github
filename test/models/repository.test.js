import fs from 'fs';
import path from 'path';
import dedent from 'dedent-js';

import Repository from '../../lib/models/repository';

import {cloneRepository, buildRepository, assertDeepPropertyVals, setUpLocalAndRemoteRepositories, getHeadCommitOnRemote, assertEqualSortedArraysByKey} from '../helpers';

describe('Repository', function() {
  describe('githubInfoFromRemote', function() {
    it('returns info about a GitHub repo based on the remote URL', function() {
      const atomRepo = {
        githubRepo: true,
        owner: 'atom',
        name: 'github',
      };

      const notARepo = {
        githubRepo: false,
        owner: null,
        name: null,
      };

      const remotes = [
        'git@github.com:atom/github.git',
        'https://github.com/atom/github.git',
        'https://git:pass@github.com/atom/github.git',
        'ssh+https://github.com/atom/github.git',
        'git://github.com/atom/github',
        'ssh://git@github.com:atom/github.git',
      ];

      for (const remote of remotes) {
        assert.deepEqual(Repository.githubInfoFromRemote(remote), atomRepo);
      }

      assert.deepEqual(Repository.githubInfoFromRemote('git@gitlab.com:atom/github.git'), notARepo);
      assert.deepEqual(Repository.githubInfoFromRemote('atom/github'), notARepo);
    });
  });

  describe('staging and unstaging files', function() {
    it('can stage and unstage modified files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      const [patch] = await repo.getUnstagedChanges();
      const filePath = patch.filePath;

      await repo.stageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
      assert.deepEqual(await repo.getStagedChanges(), [patch]);

      await repo.unstageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), [patch]);
      assert.deepEqual(await repo.getStagedChanges(), []);
    });

    it('can stage and unstage removed files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.unlinkSync(path.join(workingDirPath, 'subdir-1', 'b.txt'));
      const [patch] = await repo.getUnstagedChanges();
      const filePath = patch.filePath;

      await repo.stageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
      assert.deepEqual(await repo.getStagedChanges(), [patch]);

      await repo.unstageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), [patch]);
      assert.deepEqual(await repo.getStagedChanges(), []);
    });

    it('can stage and unstage renamed files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'subdir-1', 'd.txt'));
      const patches = await repo.getUnstagedChanges();
      const filePath1 = patches[0].filePath;
      const filePath2 = patches[1].filePath;

      await repo.stageFiles([filePath1, filePath2]);
      repo.refresh();
      assertEqualSortedArraysByKey(await repo.getStagedChanges(), patches, 'filePath');
      assert.deepEqual(await repo.getUnstagedChanges(), []);

      await repo.unstageFiles([filePath1, filePath2]);
      repo.refresh();
      assertEqualSortedArraysByKey(await repo.getUnstagedChanges(), patches, 'filePath');
      assert.deepEqual(await repo.getStagedChanges(), []);
    });

    it('can stage and unstage added files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'e.txt'), 'qux', 'utf8');
      const repo = await buildRepository(workingDirPath);
      const [patch] = await repo.getUnstagedChanges();
      const filePath = patch.filePath;

      await repo.stageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
      assert.deepEqual(await repo.getStagedChanges(), [patch]);

      await repo.unstageFiles([filePath]);
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), [patch]);
      assert.deepEqual(await repo.getStagedChanges(), []);
    });

    it('can unstage and retrieve staged changes relative to HEAD~', async function() {
      const workingDirPath = await cloneRepository('multiple-commits');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'file.txt'), 'three\nfour\n', 'utf8');
      assert.deepEqual(await repo.getStagedChangesSinceParentCommit(), [
        {
          filePath: 'file.txt',
          status: 'modified',
        },
      ]);
      assertDeepPropertyVals(await repo.getFilePatchForPath('file.txt', {staged: true, amending: true}), {
        oldPath: 'file.txt',
        newPath: 'file.txt',
        status: 'modified',
        hunks: [
          {
            lines: [
              {status: 'deleted', text: 'two', oldLineNumber: 1, newLineNumber: -1},
              {status: 'added', text: 'three', oldLineNumber: -1, newLineNumber: 1},
            ],
          },
        ],
      });

      await repo.stageFiles(['file.txt']);
      repo.refresh();
      assertDeepPropertyVals(await repo.getFilePatchForPath('file.txt', {staged: true, amending: true}), {
        oldPath: 'file.txt',
        newPath: 'file.txt',
        status: 'modified',
        hunks: [
          {
            lines: [
              {status: 'deleted', text: 'two', oldLineNumber: 1, newLineNumber: -1},
              {status: 'added', text: 'three', oldLineNumber: -1, newLineNumber: 1},
              {status: 'added', text: 'four', oldLineNumber: -1, newLineNumber: 2},
            ],
          },
        ],
      });

      await repo.stageFilesFromParentCommit(['file.txt']);
      repo.refresh();
      assert.deepEqual(await repo.getStagedChangesSinceParentCommit(), []);
    });
  });

  describe('getFilePatchForPath', function() {
    it('returns cached FilePatch objects if they exist', async function() {
      const workingDirPath = await cloneRepository('multiple-commits');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'new-file.txt'), 'foooooo', 'utf8');
      fs.writeFileSync(path.join(workingDirPath, 'file.txt'), 'qux\nfoo\nbar\n', 'utf8');
      await repo.stageFiles(['file.txt']);

      const unstagedFilePatch = await repo.getFilePatchForPath('new-file.txt');
      const stagedFilePatch = await repo.getFilePatchForPath('file.txt', {staged: true});
      const stagedFilePatchDuringAmend = await repo.getFilePatchForPath('file.txt', {staged: true, amending: true});
      assert.equal(await repo.getFilePatchForPath('new-file.txt'), unstagedFilePatch);
      assert.equal(await repo.getFilePatchForPath('file.txt', {staged: true}), stagedFilePatch);
      assert.equal(await repo.getFilePatchForPath('file.txt', {staged: true, amending: true}), stagedFilePatchDuringAmend);
    });

    it('returns new FilePatch object after repository refresh', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');

      const filePatchA = await repo.getFilePatchForPath('a.txt');
      assert.equal(await repo.getFilePatchForPath('a.txt'), filePatchA);

      repo.refresh();
      assert.notEqual(await repo.getFilePatchForPath('a.txt'), filePatchA);
      assert.deepEqual(await repo.getFilePatchForPath('a.txt'), filePatchA);
    });
  });

  describe('applyPatchToIndex', function() {
    it('can stage and unstage modified files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      const unstagedPatch1 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'));

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8');
      repo.refresh();
      const unstagedPatch2 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'));

      await repo.applyPatchToIndex(unstagedPatch1);
      repo.refresh();
      const stagedPatch1 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'), {staged: true});
      assert.deepEqual(stagedPatch1, unstagedPatch1);

      let unstagedChanges = (await repo.getUnstagedChanges()).map(c => c.filePath);
      let stagedChanges = (await repo.getStagedChanges()).map(c => c.filePath);
      assert.deepEqual(unstagedChanges, ['subdir-1/a.txt']);
      assert.deepEqual(stagedChanges, ['subdir-1/a.txt']);

      await repo.applyPatchToIndex(unstagedPatch1.getUnstagePatch());
      repo.refresh();
      const unstagedPatch3 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'));
      assert.deepEqual(unstagedPatch3, unstagedPatch2);
      unstagedChanges = (await repo.getUnstagedChanges()).map(c => c.filePath);
      stagedChanges = (await repo.getStagedChanges()).map(c => c.filePath);
      assert.deepEqual(unstagedChanges, ['subdir-1/a.txt']);
      assert.deepEqual(stagedChanges, []);
    });
  });

  describe('commit', function() {
    it('creates a commit that contains the staged changes', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      assert.equal((await repo.getLastCommit()).message, 'Initial commit');

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      const unstagedPatch1 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'));
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\nbaz\n', 'utf8');
      repo.refresh();
      await repo.applyPatchToIndex(unstagedPatch1);
      await repo.commit('Commit 1');
      assert.equal((await repo.getLastCommit()).message, 'Commit 1');
      repo.refresh();
      assert.deepEqual(await repo.getStagedChanges(), []);
      const unstagedChanges = await repo.getUnstagedChanges();
      assert.equal(unstagedChanges.length, 1);

      const unstagedPatch2 = await repo.getFilePatchForPath(path.join('subdir-1', 'a.txt'));
      await repo.applyPatchToIndex(unstagedPatch2);
      await repo.commit('Commit 2');
      assert.equal((await repo.getLastCommit()).message, 'Commit 2');
      repo.refresh();
      assert.deepEqual(await repo.getStagedChanges(), []);
      assert.deepEqual(await repo.getUnstagedChanges(), []);
    });

    it('amends the last commit when the amend option is set to true', async function() {
      const workingDirPath = await cloneRepository('multiple-commits');
      const repo = await buildRepository(workingDirPath);
      const lastCommit = await repo.git.getHeadCommit();
      const lastCommitParent = await repo.git.getCommit('HEAD~');
      await repo.commit('amend last commit', {amend: true, allowEmpty: true});
      const amendedCommit = await repo.git.getHeadCommit();
      const amendedCommitParent = await repo.git.getCommit('HEAD~');
      assert.notDeepEqual(lastCommit, amendedCommit);
      assert.deepEqual(lastCommitParent, amendedCommitParent);
    });

    it('throws an error when there are unmerged files', async function() {
      const workingDirPath = await cloneRepository('merge-conflict');
      const repository = await buildRepository(workingDirPath);
      try {
        await repository.git.merge('origin/branch');
      } catch (e) {
        // expected
      }

      assert.equal(await repository.isMerging(), true);
      const mergeBase = await repository.getLastCommit();

      try {
        await repository.commit('Merge Commit');
      } catch (e) {
        assert.isAbove(e.code, 0);
        assert.match(e.command, /commit/);
      }

      assert.equal(await repository.isMerging(), true);
      assert.equal((await repository.getLastCommit()).toString(), mergeBase.toString());
    });

    it('wraps the commit message body at 72 characters', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      await repo.stageFiles([path.join('subdir-1', 'a.txt')]);
      await repo.commit([
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
        '',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      ].join('\n'));

      const message = (await repo.getLastCommit()).message;
      assert.deepEqual(message.split('\n'), [
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor',
        '',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi',
        'ut aliquip ex ea commodo consequat.',
      ]);
    });

    it('strips out comments', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);

      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      await repo.stageFiles([path.join('subdir-1', 'a.txt')]);
      await repo.commit([
        'Make a commit',
        '',
        '# Comments:',
        '#  blah blah blah',
        '#  other stuff',
      ].join('\n'));

      assert.deepEqual((await repo.getLastCommit()).message, 'Make a commit');
    });
  });

  describe('fetch(branchName)', function() {
    it('brings commits from the remote and updates remote branch, and does not update branch', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = await buildRepository(localRepoPath);
      let remoteHead, localHead;
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.message, 'second commit');
      assert.equal(localHead.message, 'second commit');

      await localRepo.fetch('master');
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.message, 'third commit');
      assert.equal(localHead.message, 'second commit');
    });
  });

  describe('pull()', function() {
    it('updates the remote branch and merges into local branch', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = await buildRepository(localRepoPath);
      let remoteHead, localHead;
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.message, 'second commit');
      assert.equal(localHead.message, 'second commit');

      await localRepo.pull('master');
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.message, 'third commit');
      assert.equal(localHead.message, 'third commit');
    });
  });

  describe('push()', function() {
    it('sends commits to the remote and updates ', async function() {
      const {localRepoPath, remoteRepoPath} = await setUpLocalAndRemoteRepositories();
      const localRepo = await buildRepository(localRepoPath);

      let localHead, localRemoteHead, remoteHead;
      localHead = await localRepo.git.getCommit('master');
      localRemoteHead = await localRepo.git.getCommit('origin/master');
      assert.deepEqual(localHead, localRemoteHead);

      await localRepo.commit('fourth commit', {allowEmpty: true});
      await localRepo.commit('fifth commit', {allowEmpty: true});
      localHead = await localRepo.git.getCommit('master');
      localRemoteHead = await localRepo.git.getCommit('origin/master');
      remoteHead = await getHeadCommitOnRemote(remoteRepoPath);
      assert.notDeepEqual(localHead, remoteHead);
      assert.equal(remoteHead.message, 'third commit');
      assert.deepEqual(remoteHead, localRemoteHead);

      await localRepo.push('master');
      localHead = await localRepo.git.getCommit('master');
      localRemoteHead = await localRepo.git.getCommit('origin/master');
      remoteHead = await getHeadCommitOnRemote(remoteRepoPath);
      assert.deepEqual(localHead, remoteHead);
      assert.equal(remoteHead.message, 'fifth commit');
      assert.deepEqual(remoteHead, localRemoteHead);
    });
  });

  describe('getAheadCount(branchName) and getBehindCount(branchName)', function() {
    it('returns the number of commits ahead and behind the remote', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = await buildRepository(localRepoPath);

      assert.equal(await localRepo.getBehindCount('master'), 0);
      assert.equal(await localRepo.getAheadCount('master'), 0);
      await localRepo.fetch('master');
      assert.equal(await localRepo.getBehindCount('master'), 1);
      assert.equal(await localRepo.getAheadCount('master'), 0);
      await localRepo.commit('new commit', {allowEmpty: true});
      await localRepo.commit('another commit', {allowEmpty: true});
      assert.equal(await localRepo.getBehindCount('master'), 1);
      assert.equal(await localRepo.getAheadCount('master'), 2);
    });
  });

  describe('getRemoteForBranch(branchName)', function() {
    it('returns the remote name associated to the supplied branch name, null if none exists', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = await buildRepository(localRepoPath);

      assert.equal(await localRepo.getRemoteForBranch('master'), 'origin');
      await localRepo.git.exec(['remote', 'rename', 'origin', 'foo']);
      assert.equal(await localRepo.getRemoteForBranch('master'), 'foo');

      await localRepo.git.exec(['remote', 'rm', 'foo']);
      assert.isNull(await localRepo.getRemoteForBranch('master'));
    });
  });

  describe('merge conflicts', function() {
    describe('getMergeConflicts()', function() {
      it('returns a promise resolving to an array of MergeConflict objects', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const repo = await buildRepository(workingDirPath);
        try {
          await repo.git.merge('origin/branch');
        } catch (e) {
          // expected
          if (!e.message.match(/CONFLICT/)) {
            throw new Error(`merge failed for wrong reason: ${e.message}`);
          }
        }

        repo.refresh();
        let mergeConflicts = await repo.getMergeConflicts();
        const expected = [
          {
            filePath: 'added-to-both.txt',
            status: {
              file: 'modified',
              ours: 'added',
              theirs: 'added',
            },
          },
          {
            filePath: 'modified-on-both-ours.txt',
            status: {
              file: 'modified',
              ours: 'modified',
              theirs: 'modified',
            },
          },
          {
            filePath: 'modified-on-both-theirs.txt',
            status: {
              file: 'modified',
              ours: 'modified',
              theirs: 'modified',
            },
          },
          {
            filePath: 'removed-on-branch.txt',
            status: {
              file: 'equivalent',
              ours: 'modified',
              theirs: 'deleted',
            },
          },
          {
            filePath: 'removed-on-master.txt',
            status: {
              file: 'added',
              ours: 'deleted',
              theirs: 'modified',
            },
          },
        ];

        assertDeepPropertyVals(mergeConflicts, expected);

        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'));
        repo.refresh();
        mergeConflicts = await repo.getMergeConflicts();
        expected[3].status.file = 'deleted';
        assertDeepPropertyVals(mergeConflicts, expected);
      });

      it('returns an empty arry if the repo has no merge conflicts', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const repo = await buildRepository(workingDirPath);

        const mergeConflicts = await repo.getMergeConflicts();
        assert.deepEqual(mergeConflicts, []);
      });
    });

    describe('stageFiles([path])', function() {
      it('updates the staged changes accordingly', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const repo = await buildRepository(workingDirPath);
        try {
          await repo.git.merge('origin/branch');
        } catch (e) {
          // expected
        }

        repo.refresh();
        const mergeConflictPaths = (await repo.getMergeConflicts()).map(c => c.filePath);
        assert.deepEqual(mergeConflictPaths, ['added-to-both.txt', 'modified-on-both-ours.txt', 'modified-on-both-theirs.txt', 'removed-on-branch.txt', 'removed-on-master.txt']);

        let stagedFilePatches = await repo.getStagedChanges();
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), []);

        await repo.stageFiles(['added-to-both.txt']);
        repo.refresh();
        stagedFilePatches = await repo.getStagedChanges();
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), ['added-to-both.txt']);

        // choose version of the file on head
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'master modification\n', 'utf8');
        await repo.stageFiles(['modified-on-both-ours.txt']);
        repo.refresh();
        stagedFilePatches = await repo.getStagedChanges();
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), ['added-to-both.txt']);

        // choose version of the file on branch
        fs.writeFileSync(path.join(workingDirPath, 'modified-on-both-ours.txt'), 'branch modification\n', 'utf8');
        await repo.stageFiles(['modified-on-both-ours.txt']);
        repo.refresh();
        stagedFilePatches = await repo.getStagedChanges();
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), ['added-to-both.txt', 'modified-on-both-ours.txt']);

        // remove file that was deleted on branch
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-branch.txt'));
        await repo.stageFiles(['removed-on-branch.txt']);
        repo.refresh();
        stagedFilePatches = await repo.getStagedChanges();
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt']);

        // remove file that was deleted on master
        fs.unlinkSync(path.join(workingDirPath, 'removed-on-master.txt'));
        await repo.stageFiles(['removed-on-master.txt']);
        repo.refresh();
        stagedFilePatches = await repo.getStagedChanges();
        // nothing additional to stage
        assert.deepEqual(stagedFilePatches.map(patch => patch.filePath), ['added-to-both.txt', 'modified-on-both-ours.txt', 'removed-on-branch.txt']);
      });
    });

    describe('pathHasMergeMarkers()', function() {
      it('returns true if and only if the file has merge markers', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const repo = await buildRepository(workingDirPath);
        try {
          await repo.git.merge('origin/branch');
        } catch (e) {
          // expected
        }

        assert.isTrue(await repo.pathHasMergeMarkers('added-to-both.txt'));
        assert.isFalse(await repo.pathHasMergeMarkers('removed-on-master.txt'));

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
        `);
        assert.isFalse(await repo.pathHasMergeMarkers('file-with-chevrons.txt'));

        assert.isFalse(await repo.pathHasMergeMarkers('nonexistent-file.txt'));
      });
    });

    describe('abortMerge()', function() {
      describe('when the working directory is clean', function() {
        it('resets the index and the working directory to match HEAD', async function() {
          const workingDirPath = await cloneRepository('merge-conflict-abort');
          const repo = await buildRepository(workingDirPath);
          try {
            await repo.git.merge('origin/spanish');
          } catch (e) {
            // expected
          }
          assert.equal(await repo.isMerging(), true);
          await repo.abortMerge();
          assert.equal(await repo.isMerging(), false);
        });
      });

      describe('when a dirty file in the working directory is NOT under conflict', function() {
        it('successfully aborts the merge and does not affect the dirty file', async function() {
          const workingDirPath = await cloneRepository('merge-conflict-abort');
          const repo = await buildRepository(workingDirPath);
          try {
            await repo.git.merge('origin/spanish');
          } catch (e) {
            // expected
          }

          fs.writeFileSync(path.join(workingDirPath, 'fruit.txt'), 'a change\n');
          assert.equal(await repo.isMerging(), true);

          await repo.abortMerge();
          assert.equal(await repo.isMerging(), false);
          assert.equal((await repo.getStagedChanges()).length, 0);
          assert.equal((await repo.getUnstagedChanges()).length, 1);
          assert.equal(fs.readFileSync(path.join(workingDirPath, 'fruit.txt')), 'a change\n');
        });
      });

      describe('when a dirty file in the working directory is under conflict', function() {
        it('throws an error indicating that the abort could not be completed', async function() {
          const workingDirPath = await cloneRepository('merge-conflict-abort');
          const repo = await buildRepository(workingDirPath);
          try {
            await repo.git.merge('origin/spanish');
          } catch (e) {
            // expected
          }

          fs.writeFileSync(path.join(workingDirPath, 'animal.txt'), 'a change\n');
          const stagedChanges = await repo.getStagedChanges();
          const unstagedChanges = await repo.getUnstagedChanges();

          assert.equal(await repo.isMerging(), true);
          try {
            await repo.abortMerge();
            assert(false);
          } catch (e) {
            assert.match(e.command, /^git merge --abort/);
          }
          assert.equal(await repo.isMerging(), true);
          assert.deepEqual(await repo.getStagedChanges(), stagedChanges);
          assert.deepEqual(await repo.getUnstagedChanges(), unstagedChanges);
        });
      });
    });
  });

  describe('discardWorkDirChangesForPaths()', () => {
    it('can discard working directory changes in modified files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'b.txt'), 'qux\nfoo\nbar\n', 'utf8');
      const unstagedChanges = await repo.getUnstagedChanges();

      assert.equal(unstagedChanges.length, 2);
      await repo.discardWorkDirChangesForPaths(unstagedChanges.map(c => c.filePath));
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
    });

    it('can discard working directory changes in removed files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.unlinkSync(path.join(workingDirPath, 'subdir-1', 'a.txt'));
      fs.unlinkSync(path.join(workingDirPath, 'subdir-1', 'b.txt'));
      const unstagedChanges = await repo.getUnstagedChanges();

      assert.equal(unstagedChanges.length, 2);
      await repo.discardWorkDirChangesForPaths(unstagedChanges.map(c => c.filePath));
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
    });

    it('can discard working directory changes added files', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'e.txt'), 'qux', 'utf8');
      fs.writeFileSync(path.join(workingDirPath, 'subdir-1', 'f.txt'), 'qux', 'utf8');
      const unstagedChanges = await repo.getUnstagedChanges();

      assert.equal(unstagedChanges.length, 2);
      await repo.discardWorkDirChangesForPaths(unstagedChanges.map(c => c.filePath));
      repo.refresh();
      assert.deepEqual(await repo.getUnstagedChanges(), []);
    });
  });

  describe('maintaining discard history across repository instances', () => {
    it('restores the history', async () => {
      const workingDirPath = await cloneRepository('three-files');
      const repo1 = await buildRepository(workingDirPath);

      fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');

      const isSafe = () => true;
      await repo1.storeBeforeAndAfterBlobs('a.txt', isSafe, () => {
        fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'foo\nbar\n', 'utf8');
      });
      await repo1.storeBeforeAndAfterBlobs('a.txt', isSafe, () => {
        fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'bar\n', 'utf8');
      });
      const repo1History = repo1.getPartialDiscardUndoHistoryForPath('a.txt');

      const repo2 = await buildRepository(workingDirPath);
      const repo2History = repo2.getPartialDiscardUndoHistoryForPath('a.txt');

      assert.deepEqual(repo2History, repo1History);
    });
  });
});
