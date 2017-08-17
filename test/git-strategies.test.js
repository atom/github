import fs from 'fs-extra';
import path from 'path';
import http from 'http';

import mkdirp from 'mkdirp';
import dedent from 'dedent-js';
import hock from 'hock';
import {GitProcess} from 'dugite';

import CompositeGitStrategy from '../lib/composite-git-strategy';
import GitShellOutStrategy from '../lib/git-shell-out-strategy';
import WorkerManager from '../lib/worker-manager';

import {cloneRepository, initRepository, assertDeepPropertyVals} from './helpers';
import {fsStat, normalizeGitHelperPath, writeFile, getTempDir} from '../lib/helpers';

/**
 * KU Thoughts: The GitShellOutStrategy methods are tested in Repository tests for the most part
 *  For now, in order to minimize duplication, I'll limit test coverage here to methods that produce
 *  output that we rely on, to serve as documentation
 */

[
  [GitShellOutStrategy],
].forEach(function(strategies) {
  const createTestStrategy = (...args) => {
    return CompositeGitStrategy.withStrategies(strategies)(...args);
  };

  describe(`Git commands for CompositeGitStrategy made of [${strategies.map(s => s.name).join(', ')}]`, function() {
    // https://github.com/atom/github/issues/1051
    // https://github.com/atom/github/issues/898
    it('passes all environment variables to spawned git process', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const git = createTestStrategy(workingDirPath);

      // dugite copies the env for us, so this is only an issue when using a Renderer process
      await WorkerManager.getInstance().getReadyPromise();

      const hookContent = dedent`
        #!/bin/sh

        if [ "$ALLOWCOMMIT" != "true" ]
        then
          echo "cannot commit. set \\$ALLOWCOMMIT to 'true'"
          exit 1
        fi
      `;

      const hookPath = path.join(workingDirPath, '.git', 'hooks', 'pre-commit');
      await writeFile(hookPath, hookContent);
      fs.chmodSync(hookPath, 0o755);

      delete process.env.ALLOWCOMMIT;
      await assert.isRejected(git.exec(['commit', '--allow-empty', '-m', 'commit yo']), /ALLOWCOMMIT/);

      process.env.ALLOWCOMMIT = 'true';
      await git.exec(['commit', '--allow-empty', '-m', 'commit for real']);
    });

    describe('resolveDotGitDir', function() {
      it('returns the path to the .git dir for a working directory if it exists, and null otherwise', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const dotGitFolder = await git.resolveDotGitDir(workingDirPath);
        assert.equal(dotGitFolder, path.join(workingDirPath, '.git'));

        fs.removeSync(path.join(workingDirPath, '.git'));
        assert.isNull(await git.resolveDotGitDir(workingDirPath));
      });

      it('supports gitdir files', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const workingDirPathWithDotGitFile = await getTempDir();
        await writeFile(path.join(workingDirPathWithDotGitFile, '.git'), `gitdir: ${path.join(workingDirPath, '.git')}`);

        const git = createTestStrategy(workingDirPathWithDotGitFile);
        const dotGitFolder = await git.resolveDotGitDir(workingDirPathWithDotGitFile);
        assert.equal(dotGitFolder, path.join(workingDirPath, '.git'));
      });
    });

    if (process.platform === 'win32') {
      describe('getStatusBundle()', function() {
        it('normalizes the path separator on Windows', async function() {
          const workingDir = await cloneRepository('three-files');
          const git = createTestStrategy(workingDir);
          const [relPathA, relPathB] = ['a.txt', 'b.txt'].map(fileName => path.join('subdir-1', fileName));
          const [absPathA, absPathB] = [relPathA, relPathB].map(relPath => path.join(workingDir, relPath));

          await writeFile(absPathA, 'some changes here\n');
          await writeFile(absPathB, 'more changes here\n');
          await git.stageFiles([relPathB]);

          const {changedEntries} = await git.getStatusBundle();
          const changedPaths = changedEntries.map(entry => entry.filePath);
          assert.deepEqual(changedPaths, [relPathA, relPathB]);
        });
      });
    }

    describe('getHeadCommit()', function() {
      it('gets the SHA and message of the most recent commit', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);

        const commit = await git.getHeadCommit();
        assert.equal(commit.sha, '66d11860af6d28eb38349ef83de475597cb0e8b4');
        assert.equal(commit.message, 'Initial commit');
        assert.isFalse(commit.unbornRef);
      });

      it('notes when HEAD is an unborn ref', async function() {
        const workingDirPath = await initRepository();
        const git = createTestStrategy(workingDirPath);

        const commit = await git.getHeadCommit();
        assert.isTrue(commit.unbornRef);
      });
    });

    describe('diffFileStatus', function() {
      it('returns an object with working directory file diff status between relative to specified target commit', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
        fs.unlinkSync(path.join(workingDirPath, 'b.txt'));
        fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'));
        fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8');
        const diffOutput = await git.diffFileStatus({target: 'HEAD'});
        assert.deepEqual(diffOutput, {
          'a.txt': 'modified',
          'b.txt': 'deleted',
          'c.txt': 'deleted',
          'd.txt': 'added',
          'e.txt': 'added',
        });
      });

      it('returns an empty object if there are no added, modified, or removed files', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const diffOutput = await git.diffFileStatus({target: 'HEAD'});
        assert.deepEqual(diffOutput, {});
      });

      it('only returns untracked files if the staged option is not passed', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        fs.writeFileSync(path.join(workingDirPath, 'new-file.txt'), 'qux', 'utf8');
        let diffOutput = await git.diffFileStatus({target: 'HEAD'});
        assert.deepEqual(diffOutput, {'new-file.txt': 'added'});
        diffOutput = await git.diffFileStatus({target: 'HEAD', staged: true});
        assert.deepEqual(diffOutput, {});
      });
    });

    describe('getUntrackedFiles', function() {
      it('returns an array of untracked file paths', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        fs.writeFileSync(path.join(workingDirPath, 'd.txt'), 'foo', 'utf8');
        fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'bar', 'utf8');
        fs.writeFileSync(path.join(workingDirPath, 'f.txt'), 'qux', 'utf8');
        assert.deepEqual(await git.getUntrackedFiles(), ['d.txt', 'e.txt', 'f.txt']);
      });

      it('handles untracked files in nested folders', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        fs.writeFileSync(path.join(workingDirPath, 'd.txt'), 'foo', 'utf8');
        const folderPath = path.join(workingDirPath, 'folder', 'subfolder');
        mkdirp.sync(folderPath);
        fs.writeFileSync(path.join(folderPath, 'e.txt'), 'bar', 'utf8');
        fs.writeFileSync(path.join(folderPath, 'f.txt'), 'qux', 'utf8');
        assert.deepEqual(await git.getUntrackedFiles(), [
          'd.txt',
          path.join('folder', 'subfolder', 'e.txt'),
          path.join('folder', 'subfolder', 'f.txt'),
        ]);
      });

      it('returns an empty array if there are no untracked files', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        assert.deepEqual(await git.getUntrackedFiles(), []);
      });
    });

    describe('getDiffForFilePath', function() {
      it('returns an empty array if there are no modified, added, or deleted files', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);

        const diffOutput = await git.getDiffForFilePath('a.txt');
        assert.isUndefined(diffOutput);
      });

      it('ignores merge conflict files', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const git = createTestStrategy(workingDirPath);
        const diffOutput = await git.getDiffForFilePath('added-to-both.txt');
        assert.isUndefined(diffOutput);
      });

      describe('when the file is unstaged', function() {
        it('returns a diff comparing the working directory copy of the file and the version on the index', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);
          fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
          fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'));

          assertDeepPropertyVals(await git.getDiffForFilePath('a.txt'), {
            oldPath: 'a.txt',
            newPath: 'a.txt',
            oldMode: '100644',
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 1,
                oldLineCount: 1,
                newStartLine: 1,
                newLineCount: 3,
                heading: '',
                lines: [
                  '+qux',
                  ' foo',
                  '+bar',
                ],
              },
            ],
            status: 'modified',
          });

          assertDeepPropertyVals(await git.getDiffForFilePath('c.txt'), {
            oldPath: 'c.txt',
            newPath: null,
            oldMode: '100644',
            newMode: null,
            hunks: [
              {
                oldStartLine: 1,
                oldLineCount: 1,
                newStartLine: 0,
                newLineCount: 0,
                heading: '',
                lines: ['-baz'],
              },
            ],
            status: 'deleted',
          });

          assertDeepPropertyVals(await git.getDiffForFilePath('d.txt'), {
            oldPath: null,
            newPath: 'd.txt',
            oldMode: null,
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 0,
                oldLineCount: 0,
                newStartLine: 1,
                newLineCount: 1,
                heading: '',
                lines: ['+baz'],
              },
            ],
            status: 'added',
          });
        });
      });

      describe('when the file is staged', function() {
        it('returns a diff comparing the index and head versions of the file', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);
          fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
          fs.renameSync(path.join(workingDirPath, 'c.txt'), path.join(workingDirPath, 'd.txt'));
          await git.exec(['add', '.']);

          assertDeepPropertyVals(await git.getDiffForFilePath('a.txt', {staged: true}), {
            oldPath: 'a.txt',
            newPath: 'a.txt',
            oldMode: '100644',
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 1,
                oldLineCount: 1,
                newStartLine: 1,
                newLineCount: 3,
                heading: '',
                lines: [
                  '+qux',
                  ' foo',
                  '+bar',
                ],
              },
            ],
            status: 'modified',
          });

          assertDeepPropertyVals(await git.getDiffForFilePath('c.txt', {staged: true}), {
            oldPath: 'c.txt',
            newPath: null,
            oldMode: '100644',
            newMode: null,
            hunks: [
              {
                oldStartLine: 1,
                oldLineCount: 1,
                newStartLine: 0,
                newLineCount: 0,
                heading: '',
                lines: ['-baz'],
              },
            ],
            status: 'deleted',
          });

          assertDeepPropertyVals(await git.getDiffForFilePath('d.txt', {staged: true}), {
            oldPath: null,
            newPath: 'd.txt',
            oldMode: null,
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 0,
                oldLineCount: 0,
                newStartLine: 1,
                newLineCount: 1,
                heading: '',
                lines: ['+baz'],
              },
            ],
            status: 'added',
          });
        });
      });

      describe('when the file is staged and a base commit is specified', function() {
        it('returns a diff comparing the file on the index and in the specified commit', async function() {
          const workingDirPath = await cloneRepository('multiple-commits');
          const git = createTestStrategy(workingDirPath);

          assertDeepPropertyVals(await git.getDiffForFilePath('file.txt', {staged: true, baseCommit: 'HEAD~'}), {
            oldPath: 'file.txt',
            newPath: 'file.txt',
            oldMode: '100644',
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 1,
                oldLineCount: 1,
                newStartLine: 1,
                newLineCount: 1,
                heading: '',
                lines: ['-two', '+three'],
              },
            ],
            status: 'modified',
          });
        });
      });

      describe('when the file is new', function() {
        it('returns a diff representing the addition of the file', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);
          fs.writeFileSync(path.join(workingDirPath, 'new-file.txt'), 'qux\nfoo\nbar\n', 'utf8');
          assertDeepPropertyVals(await git.getDiffForFilePath('new-file.txt'), {
            oldPath: null,
            newPath: 'new-file.txt',
            oldMode: null,
            newMode: '100644',
            hunks: [
              {
                oldStartLine: 0,
                oldLineCount: 0,
                newStartLine: 1,
                newLineCount: 3,
                heading: '',
                lines: [
                  '+qux',
                  '+foo',
                  '+bar',
                ],
              },
            ],
            status: 'added',
          });

        });

        describe('when the file is binary', function() {
          it('returns an empty diff', async function() {
            const workingDirPath = await cloneRepository('three-files');
            const git = createTestStrategy(workingDirPath);
            const data = new Buffer(10);
            for (let i = 0; i < 10; i++) {
              data.writeUInt8(i + 200, i);
            }
            fs.writeFileSync(path.join(workingDirPath, 'new-file.bin'), data);
            assertDeepPropertyVals(await git.getDiffForFilePath('new-file.bin'), {
              oldPath: null,
              newPath: 'new-file.bin',
              oldMode: null,
              newMode: '100644',
              hunks: [],
              status: 'added',
            });
          });
        });
      });
    });

    describe('isMerging', function() {
      it('returns true if `.git/MERGE_HEAD` exists', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const dotGitDir = path.join(workingDirPath, '.git');
        const git = createTestStrategy(workingDirPath);
        let isMerging = await git.isMerging(dotGitDir);
        assert.isFalse(isMerging);

        try {
          await git.merge('origin/branch');
        } catch (e) {
          // expect merge to have conflicts
        }
        isMerging = await git.isMerging(dotGitDir);
        assert.isTrue(isMerging);

        fs.unlinkSync(path.join(workingDirPath, '.git', 'MERGE_HEAD'));
        isMerging = await git.isMerging(dotGitDir);
        assert.isFalse(isMerging);
      });
    });

    describe('checkout(branchName, {createNew})', function() {
      it('returns the current branch name', async function() {
        const workingDirPath = await cloneRepository('merge-conflict');
        const git = createTestStrategy(workingDirPath);
        assert.deepEqual((await git.exec(['symbolic-ref', '--short', 'HEAD'])).trim(), 'master');
        await git.checkout('branch');
        assert.deepEqual((await git.exec(['symbolic-ref', '--short', 'HEAD'])).trim(), 'branch');

        // newBranch does not yet exist
        await assert.isRejected(git.checkout('newBranch'));
        assert.deepEqual((await git.exec(['symbolic-ref', '--short', 'HEAD'])).trim(), 'branch');
        assert.deepEqual((await git.exec(['symbolic-ref', '--short', 'HEAD'])).trim(), 'branch');
        await git.checkout('newBranch', {createNew: true});
        assert.deepEqual((await git.exec(['symbolic-ref', '--short', 'HEAD'])).trim(), 'newBranch');
      });
    });

    describe('getBranches()', function() {
      it('returns an array of all branches', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        assert.deepEqual(await git.getBranches(), ['master']);
        await git.checkout('new-branch', {createNew: true});
        assert.deepEqual(await git.getBranches(), ['master', 'new-branch']);
        await git.checkout('another-branch', {createNew: true});
        assert.deepEqual(await git.getBranches(), ['another-branch', 'master', 'new-branch']);
      });

      it('includes branches with slashes in the name', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        assert.deepEqual(await git.getBranches(), ['master']);
        await git.checkout('a/fancy/new/branch', {createNew: true});
        assert.deepEqual(await git.getBranches(), ['a/fancy/new/branch', 'master']);
      });
    });

    describe('getRemotes()', function() {
      it('returns an array of remotes', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        await git.exec(['remote', 'set-url', 'origin', 'git@github.com:other/origin.git']);
        await git.exec(['remote', 'add', 'upstream', 'git@github.com:my/upstream.git']);
        await git.exec(['remote', 'add', 'another.remote', 'git@github.com:another/upstream.git']);
        const remotes = await git.getRemotes();
        // Note: nodegit returns remote names in alphabetical order
        assert.equal(remotes.length, 3);
        [
          {name: 'another.remote', url: 'git@github.com:another/upstream.git'},
          {name: 'origin', url: 'git@github.com:other/origin.git'},
          {name: 'upstream', url: 'git@github.com:my/upstream.git'},
        ].forEach(remote => {
          assert.include(remotes, remote);
        });
      });

      it('returns an empty array when no remotes are set up', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        await git.exec(['remote', 'rm', 'origin']);
        const remotes = await git.getRemotes();
        assert.deepEqual(remotes, []);
      });
    });

    describe('getConfig() and setConfig()', function() {
      it('gets and sets configs', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        assert.isNull(await git.getConfig('awesome.devs'));
        await git.setConfig('awesome.devs', 'BinaryMuse,kuychaco,smashwilson');
        assert.equal('BinaryMuse,kuychaco,smashwilson', await git.getConfig('awesome.devs'));
      });
    });

    describe('commit(message, options) where amend option is true', function() {
      it('amends the last commit', async function() {
        const workingDirPath = await cloneRepository('multiple-commits');
        const git = createTestStrategy(workingDirPath);
        const lastCommit = await git.getHeadCommit();
        const lastCommitParent = await git.getCommit('HEAD~');
        await git.commit('amend last commit', {amend: true, allowEmpty: true});
        const amendedCommit = await git.getHeadCommit();
        const amendedCommitParent = await git.getCommit('HEAD~');
        assert.notDeepEqual(lastCommit, amendedCommit);
        assert.deepEqual(lastCommitParent, amendedCommitParent);
      });
    });

    // Only needs to be tested on strategies that actually implement gpgExec
    describe('GPG signing', function() {
      let git;

      // eslint-disable-next-line jasmine/no-global-setup
      beforeEach(async function() {
        const workingDirPath = await cloneRepository('multiple-commits');
        git = createTestStrategy(workingDirPath);
      });

      const operations = [
        {
          command: 'commit',
          progressiveTense: 'committing',
          usesPromptServerAlready: false,
          action: () => git.commit('message'),
        },
        {
          command: 'merge',
          progressiveTense: 'merging',
          usesPromptServerAlready: false,
          action: () => git.merge('some-branch'),
        },
        {
          command: 'pull',
          progressiveTense: 'pulling',
          usesPromptServerAlready: true,
          action: () => git.pull('origin', 'some-branch'),
        },
      ];

      const notCancelled = () => assert.fail('', '', 'Unexpected operation cancel');

      operations.forEach(op => {
        it(`overrides gpg.program when ${op.progressiveTense}`, async function() {
          const execStub = sinon.stub(git, 'executeGitCommand');
          execStub.returns({
            promise: Promise.resolve({stdout: '', stderr: '', exitCode: 0}),
            cancel: notCancelled,
          });

          await op.action();

          const [args, options] = execStub.getCall(0).args;

          assertGitConfigSetting(args, op.command, 'gpg.program', '.*gpg-wrapper\\.sh$');
        });
      });
    });

    describe('the built-in credential helper', function() {
      let git, originalEnv;

      beforeEach(async function() {
        const workingDirPath = await cloneRepository('multiple-commits');
        git = createTestStrategy(workingDirPath, {
          prompt: Promise.resolve(''),
        });

        originalEnv = {};
        ['PATH', 'DISPLAY', 'GIT_ASKPASS', 'SSH_ASKPASS', 'GIT_SSH_COMMAND'].forEach(varName => {
          originalEnv[varName] = process.env[varName];
        });
      });

      afterEach(function() {
        Object.keys(originalEnv).forEach(varName => {
          process.env[varName] = originalEnv[varName];
        });
      });

      const operations = [
        {
          command: 'fetch',
          progressiveTense: 'fetching',
          action: () => git.fetch('origin', 'some-branch'),
        },
        {
          command: 'pull',
          progressiveTense: 'pulling',
          action: () => git.pull('origin', 'some-branch'),
        },
        {
          command: 'push',
          progressiveTense: 'pushing',
          action: () => git.push('origin', 'some-branch'),
        },
      ];

      const notCancelled = () => assert.fail('', '', 'Unexpected operation cancel');

      operations.forEach(op => {
        it(`temporarily supplements credential.helper when ${op.progressiveTense}`, async function() {
          const execStub = sinon.stub(git, 'executeGitCommand');
          execStub.returns({
            promise: Promise.resolve({stdout: '', stderr: '', exitCode: 0}),
            cancel: notCancelled,
          });
          if (op.configureStub) {
            op.configureStub(git);
          }


          delete process.env.DISPLAY;
          process.env.GIT_ASKPASS = '/some/git-askpass.sh';
          process.env.SSH_ASKPASS = '/some/ssh-askpass.sh';
          process.env.GIT_SSH_COMMAND = '/original/ssh-command';

          await op.action();

          const [args, options] = execStub.getCall(0).args;

          // Used by https remotes
          assertGitConfigSetting(args, op.command, 'credential.helper', '.*git-credential-atom\\.sh');

          // Used by SSH remotes
          assert.match(options.env.DISPLAY, /^.+$/);
          assert.match(options.env.SSH_ASKPASS, /git-askpass-atom\.sh$/);
          assert.match(options.env.GIT_ASKPASS, /git-askpass-atom\.sh$/);
          if (process.platform === 'linux') {
            assert.match(options.env.GIT_SSH_COMMAND, /linux-ssh-wrapper\.sh$/);
          }

          // Preserved environment variables for subprocesses
          assert.equal(options.env.ATOM_GITHUB_ORIGINAL_GIT_ASKPASS, '/some/git-askpass.sh');
          assert.equal(options.env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS, '/some/ssh-askpass.sh');
          assert.equal(options.env.ATOM_GITHUB_ORIGINAL_GIT_SSH_COMMAND, '/original/ssh-command');
        });
      });
    });

    describe('createBlob({filePath})', function() {
      it('creates a blob for the file path specified and returns its sha', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        fs.writeFileSync(path.join(workingDirPath, 'a.txt'), 'qux\nfoo\nbar\n', 'utf8');
        const sha = await git.createBlob({filePath: 'a.txt'});
        assert.equal(sha, 'c9f54222977c93ea17ba4a5a53c611fa7f1aaf56');
        const contents = await git.exec(['cat-file', '-p', sha]);
        assert.equal(contents, 'qux\nfoo\nbar\n');
      });

      it('creates a blob for the stdin specified and returns its sha', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const sha = await git.createBlob({stdin: 'foo\n'});
        assert.equal(sha, '257cc5642cb1a054f08cc83f2d943e56fd3ebe99');
        const contents = await git.exec(['cat-file', '-p', sha]);
        assert.equal(contents, 'foo\n');
      });
    });

    describe('expandBlobToFile(absFilePath, sha)', function() {
      it('restores blob contents for sha to specified file path', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const absFilePath = path.join(workingDirPath, 'a.txt');
        fs.writeFileSync(absFilePath, 'qux\nfoo\nbar\n', 'utf8');
        const sha = await git.createBlob({filePath: 'a.txt'});
        fs.writeFileSync(absFilePath, 'modifications', 'utf8');
        await git.expandBlobToFile(absFilePath, sha);
        assert.equal(fs.readFileSync(absFilePath), 'qux\nfoo\nbar\n');
      });
    });

    describe('getBlobContents(sha)', function() {
      it('returns blob contents for sha', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const sha = await git.createBlob({stdin: 'foo\nbar\nbaz\n'});
        const contents = await git.getBlobContents(sha);
        assert.equal(contents, 'foo\nbar\nbaz\n');
      });
    });

    describe('getFileMode(filePath)', function() {
      it('returns the file mode of the specified file', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const absFilePath = path.join(workingDirPath, 'a.txt');
        fs.writeFileSync(absFilePath, 'qux\nfoo\nbar\n', 'utf8');

        assert.equal(await git.getFileMode('a.txt'), '100644');

        await git.exec(['update-index', '--chmod=+x', 'a.txt']);
        assert.equal(await git.getFileMode('a.txt'), '100755');
      });

      it('returns the file mode for untracked files', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const absFilePath = path.join(workingDirPath, 'new-file.txt');
        fs.writeFileSync(absFilePath, 'qux\nfoo\nbar\n', 'utf8');
        const regularMode = await fsStat(absFilePath).mode;
        const executableMode = regularMode | fs.constants.S_IXUSR; // eslint-disable-line no-bitwise

        assert.equal(await git.getFileMode('new-file.txt'), '100644');

        fs.chmodSync(absFilePath, executableMode);
        const expectedFileMode = process.platform === 'win32' ? '100644' : '100755';
        assert.equal(await git.getFileMode('new-file.txt'), expectedFileMode);
      });
    });

    describe('merging files', function() {
      describe('mergeFile(oursPath, commonBasePath, theirsPath, resultPath)', function() {
        it('merges ours/base/theirsPaths and writes to resultPath, returning {filePath, resultPath, conflicts}', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);

          const aPath = path.join(workingDirPath, 'a.txt');
          const withoutConflictPath = path.join(workingDirPath, 'results-without-conflict.txt');
          const withConflictPath = path.join(workingDirPath, 'results-with-conflict.txt');

          // current and other paths are the same, so no conflicts
          const resultsWithoutConflict = await git.mergeFile('a.txt', 'b.txt', 'a.txt', 'results-without-conflict.txt');
          assert.deepEqual(resultsWithoutConflict, {
            filePath: 'a.txt',
            resultPath: 'results-without-conflict.txt',
            conflict: false,
          });
          assert.equal(fs.readFileSync(withoutConflictPath, 'utf8'), fs.readFileSync(aPath, 'utf8'));

          // contents of current and other paths conflict
          const resultsWithConflict = await git.mergeFile('a.txt', 'b.txt', 'c.txt', 'results-with-conflict.txt');
          assert.deepEqual(resultsWithConflict, {
            filePath: 'a.txt',
            resultPath: 'results-with-conflict.txt',
            conflict: true,
          });
          const contents = fs.readFileSync(withConflictPath, 'utf8');
          assert.isTrue(contents.includes('<<<<<<<'));
          assert.isTrue(contents.includes('>>>>>>>'));
        });
      });

      describe('udpateIndex(filePath, commonBaseSha, oursSha, theirsSha)', function() {
        it('updates the index to have the appropriate shas, retaining the original file mode', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);
          const absFilePath = path.join(workingDirPath, 'a.txt');
          fs.writeFileSync(absFilePath, 'qux\nfoo\nbar\n', 'utf8');
          await git.exec(['update-index', '--chmod=+x', 'a.txt']);

          const commonBaseSha = '7f95a814cbd9b366c5dedb6d812536dfef2fffb7';
          const oursSha = '95d4c5b7b96b3eb0853f586576dc8b5ac54837e0';
          const theirsSha = '5da808cc8998a762ec2761f8be2338617f8f12d9';
          await git.writeMergeConflictToIndex('a.txt', commonBaseSha, oursSha, theirsSha);

          const index = await git.exec(['ls-files', '--stage', '--', 'a.txt']);
          assert.equal(index.trim(), dedent`
            100755 ${commonBaseSha} 1\ta.txt
            100755 ${oursSha} 2\ta.txt
            100755 ${theirsSha} 3\ta.txt
          `);
        });

        it('handles the case when oursSha, commonBaseSha, or theirsSha is null', async function() {
          const workingDirPath = await cloneRepository('three-files');
          const git = createTestStrategy(workingDirPath);
          const absFilePath = path.join(workingDirPath, 'a.txt');
          fs.writeFileSync(absFilePath, 'qux\nfoo\nbar\n', 'utf8');
          await git.exec(['update-index', '--chmod=+x', 'a.txt']);

          const commonBaseSha = '7f95a814cbd9b366c5dedb6d812536dfef2fffb7';
          const oursSha = '95d4c5b7b96b3eb0853f586576dc8b5ac54837e0';
          const theirsSha = '5da808cc8998a762ec2761f8be2338617f8f12d9';
          await git.writeMergeConflictToIndex('a.txt', commonBaseSha, null, theirsSha);

          let index = await git.exec(['ls-files', '--stage', '--', 'a.txt']);
          assert.equal(index.trim(), dedent`
            100755 ${commonBaseSha} 1\ta.txt
            100755 ${theirsSha} 3\ta.txt
          `);

          await git.writeMergeConflictToIndex('a.txt', commonBaseSha, oursSha, null);

          index = await git.exec(['ls-files', '--stage', '--', 'a.txt']);
          assert.equal(index.trim(), dedent`
            100755 ${commonBaseSha} 1\ta.txt
            100755 ${oursSha} 2\ta.txt
          `);

          await git.writeMergeConflictToIndex('a.txt', null, oursSha, theirsSha);

          index = await git.exec(['ls-files', '--stage', '--', 'a.txt']);
          assert.equal(index.trim(), dedent`
            100755 ${oursSha} 2\ta.txt
            100755 ${theirsSha} 3\ta.txt
          `);
        });
      });
    });

    describe('executeGitCommand', function() {
      it('shells out in process until WorkerManager instance is ready', async function() {
        const workingDirPath = await cloneRepository('three-files');
        const git = createTestStrategy(workingDirPath);
        const workerManager = WorkerManager.getInstance();
        sinon.stub(workerManager, 'isReady');
        sinon.stub(GitProcess, 'exec');
        sinon.stub(workerManager, 'request');

        workerManager.isReady.returns(false);
        git.executeGitCommand([], {});
        assert.equal(GitProcess.exec.callCount, 1);
        assert.equal(workerManager.request.callCount, 0);

        workerManager.isReady.returns(true);
        git.executeGitCommand([], {});
        assert.equal(GitProcess.exec.callCount, 1);
        assert.equal(workerManager.request.callCount, 1);

        workerManager.isReady.returns(false);
        git.executeGitCommand([], {});
        assert.equal(GitProcess.exec.callCount, 2);
        assert.equal(workerManager.request.callCount, 1);

        workerManager.isReady.returns(true);
        git.executeGitCommand([], {});
        assert.equal(GitProcess.exec.callCount, 2);
        assert.equal(workerManager.request.callCount, 2);
      });
    });

    describe('https authentication', function() {
      const envKeys = ['SSH_ASKPASS', 'GIT_ASKPASS'];
      let preserved;

      beforeEach(function() {
        preserved = {};
        for (let i = 0; i < envKeys.length; i++) {
          const key = envKeys[i];
          preserved[key] = process.env[key];
        }

        process.env.SSH_ASKPASS = '';
        process.env.GIT_ASKPASS = '';
      });

      afterEach(function() {
        for (let i = 0; i < envKeys.length; i++) {
          const key = envKeys[i];
          process.env[key] = preserved[key];
        }
      });

      async function withHttpRemote(options) {
        const workdir = await cloneRepository('three-files');
        const git = createTestStrategy(workdir, options);

        const mockGitServer = hock.createHock();

        const uploadPackAdvertisement = '001e# service=git-upload-pack\n' +
          '0000' +
          '005a66d11860af6d28eb38349ef83de475597cb0e8b4 HEAD\0multi_ack symref=HEAD:refs/heads/master\n' +
          '003f66d11860af6d28eb38349ef83de475597cb0e8b4 refs/heads/master\n' +
          '0000';

        // Accepted auth data:
        // me:open-sesame
        mockGitServer
          .get('/some/repo.git/info/refs?service=git-upload-pack')
          .reply(401, '', {'WWW-Authenticate': 'Basic realm="SomeRealm"'})
          .get('/some/repo.git/info/refs?service=git-upload-pack', {Authorization: 'Basic bWU6b3Blbi1zZXNhbWU='})
          .reply(200, uploadPackAdvertisement, {'Content-Type': 'application/x-git-upload-pack-advertisement'})
          .get('/some/repo.git/info/refs?service=git-upload-pack')
          .reply(400);

        const server = http.createServer(mockGitServer.handler);
        return new Promise(resolve => {
          server.listen(0, '127.0.0.1', async () => {
            const {address, port} = server.address();
            await git.setConfig('remote.mock.url', `http://${address}:${port}/some/repo.git`);
            await git.setConfig('remote.mock.fetch', '+refs/heads/*:refs/remotes/origin/*');

            resolve(git);
          });
        });
      }

      it('prompts for authentication data through Atom', async function() {
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({username: 'me', password: 'open-sesame'});
          },
        });

        await git.fetch('mock', 'master');

        assert.match(
          query.prompt,
          /^Please enter your credentials for http:\/\/(::|127\.0\.0\.1):[0-9]{0,5}/,
        );
        assert.isTrue(query.includeUsername);
      });

      it('fails the command on authentication failure', async function() {
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({username: 'me', password: 'whoops'});
          },
        });

        await assert.isRejected(git.fetch('mock', 'master'));

        assert.match(
          query.prompt,
          /^Please enter your credentials for http:\/\/(::|127\.0\.0\.1):[0-9]{0,5}/,
        );
        assert.isTrue(query.includeUsername);
      });

      it('fails the command on dialog cancel', async function() {
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.reject(new Error('nevermind'));
          },
        });

        await git.fetch('mock', 'master');

        assert.match(
          query.prompt,
          /^Please enter your credentials for http:\/\/(::|127\.0\.0\.1):[0-9]{0,5}/,
        );
        assert.isTrue(query.includeUsername);
      });

      it('prefers user-configured credential helpers if present', async function() {
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.resolve();
          },
        });

        await git.setConfig(
          'credential.helper',
          normalizeGitHelperPath(path.join(__dirname, 'scripts', 'credential-helper-success.sh')),
        );

        await git.fetch('mock', 'master');

        assert.isNull(query);
      });

      it('falls back to Atom credential prompts if credential helpers are present but fail', async function() {
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({username: 'me', password: 'open-sesame'});
          },
        });

        await git.setConfig(
          'credential.helper',
          normalizeGitHelperPath(path.join(__dirname, 'scripts', 'credential-helper-notfound.sh')),
        );

        await git.fetch('mock', 'master');

        assert.match(
          query.prompt,
          /^Please enter your credentials for http:\/\/127\.0\.0\.1:[0-9]{0,5}/,
        );
        assert.isTrue(query.includeUsername);
      });

      it('falls back to Atom credential prompts if credential helpers are present but explode', async function() {
        this.retries(5);
        let query = null;
        const git = await withHttpRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({username: 'me', password: 'open-sesame'});
          },
        });

        await git.setConfig(
          'credential.helper',
          normalizeGitHelperPath(path.join(__dirname, 'scripts', 'credential-helper-kaboom.sh')),
        );

        await git.fetch('mock', 'master');

        assert.match(
          query.prompt,
          /^Please enter your credentials for http:\/\/127\.0\.0\.1:[0-9]{0,5}/,
        );
        assert.isTrue(query.includeUsername);
      });
    });

    describe('ssh authentication', function() {
      const envKeys = ['GIT_SSH_COMMAND', 'SSH_AUTH_SOCK', 'SSH_ASKPASS', 'GIT_ASKPASS'];
      let preserved;

      beforeEach(function() {
        preserved = {};
        for (let i = 0; i < envKeys.length; i++) {
          const key = envKeys[i];
          preserved[key] = process.env[key];
        }

        delete process.env.SSH_AUTH_SOCK;
        process.env.SSH_ASKPASS = '';
        process.env.GIT_ASKPASS = '';
      });

      afterEach(function() {
        for (let i = 0; i < envKeys.length; i++) {
          const key = envKeys[i];
          process.env[key] = preserved[key];
        }
      });

      async function withSSHRemote(options) {
        const workdir = await cloneRepository('three-files');
        const git = createTestStrategy(workdir, options);

        await git.setConfig('remote.mock.url', 'git@github.com:atom/nope.git');
        await git.setConfig('remote.mock.fetch', '+refs/heads/*:refs/remotes/origin/*');

        // Append ' #' to ensure the script is run with sh on Windows.
        // https://github.com/git/git/blob/027a3b943b444a3e3a76f9a89803fc10245b858f/run-command.c#L196-L221
        process.env.GIT_SSH_COMMAND = normalizeGitHelperPath(path.join(__dirname, 'scripts', 'ssh-remote.sh')) + ' #';

        return git;
      }

      it('prompts for an SSH password through Atom', async function() {
        let query = null;
        const git = await withSSHRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({password: 'friend'});
          },
        });

        await git.fetch('mock', 'master');

        assert.equal(query.prompt, 'Speak friend and enter');
        assert.isFalse(query.includeUsername);
      });

      it('fails the command on authentication failure', async function() {
        let query = null;
        const git = await withSSHRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({password: 'let me in damnit'});
          },
        });

        await assert.isRejected(git.fetch('mock', 'master'));

        assert.equal(query.prompt, 'Speak friend and enter');
        assert.isFalse(query.includeUsername);
      });

      it('fails the command on dialog cancel', async function() {
        let query = null;
        const git = await withSSHRemote({
          prompt: q => {
            query = q;
            return Promise.reject(new Error('nah'));
          },
        });

        // The git operation Promise does *not* reject if the git process is killed by a signal.
        await git.fetch('mock', 'master');

        assert.equal(query.prompt, 'Speak friend and enter');
        assert.isFalse(query.includeUsername);
      });

      it('prefers a user-configured SSH_ASKPASS if present', async function() {
        let query = null;
        const git = await withSSHRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({password: 'BZZT'});
          },
        });

        process.env.SSH_ASKPASS = normalizeGitHelperPath(path.join(__dirname, 'scripts', 'askpass-success.sh'));

        await git.fetch('mock', 'master');
        assert.isNull(query);
      });

      it('falls back to Atom credential prompts if SSH_ASKPASS is present but goes boom', async function() {
        let query = null;
        const git = await withSSHRemote({
          prompt: q => {
            query = q;
            return Promise.resolve({password: 'friend'});
          },
        });

        process.env.SSH_ASKPASS = normalizeGitHelperPath(path.join(__dirname, 'scripts', 'askpass-kaboom.sh'));

        await git.fetch('mock', 'master');

        assert.equal(query.prompt, 'Speak friend and enter');
        assert.isFalse(query.includeUsername);
      });
    });
  });
});

function assertGitConfigSetting(args, command, settingName, valuePattern = '.*$') {
  const commandIndex = args.indexOf(command);
  assert.notEqual(commandIndex, -1, `${command} not found in exec arguments ${args.join(' ')}`);

  const settingNamePattern = settingName.replace(/[.\\()[\]{}+*^$]/, '\\$&');

  const valueRx = new RegExp(`^${settingNamePattern}=${valuePattern}`);

  for (let i = 0; i < commandIndex; i++) {
    if (args[i] === '-c' && valueRx.test(args[i + 1] || '')) {
      return;
    }
  }

  assert.fail('', '', `Setting ${settingName} not found in exec arguments ${args.join(' ')}`);
}
