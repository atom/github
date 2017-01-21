import path from 'path';

import {CompositeDisposable} from 'atom';

import {GitProcess} from 'git-kitchen-sink';
import {parse as parseDiff} from 'what-the-diff';

import GitPromptServer from './git-prompt-server';
import AsyncQueue from './async-queue';
import {readFile, fsStat, deleteFileOrFolder} from './helpers';

const LINE_ENDING_REGEX = /\r?\n/;

const GPG_HELPER_PATH = path.resolve(__dirname, '..', 'bin', 'gpg-no-tty.sh');

export class GitError extends Error {
  constructor(message, stdErr) {
    super(message);
    this.message = message;
    this.stdErr = stdErr;
    this.stack = new Error().stack;
  }
}

/**
 * Prepend the git arguments that will intercept any `gpg` calls with the `gpg-no-tty.sh` script.
 */
function withGpgScript(args) {
  return ['-c', `gpg.program=${GPG_HELPER_PATH}`].concat(args);
}

export default class GitShellOutStrategy {
  constructor(workingDir) {
    this.workingDir = workingDir;
    this.commandQueue = new AsyncQueue();
  }

  // Execute a command and read the output using the embedded Git environment
  exec(args, stdin = null, useGitPromptServer = false) {
    /* eslint-disable no-console */
    const subscriptions = new CompositeDisposable();
    return this.commandQueue.push(async () => {
      const formattedArgs = `git ${args.join(' ')} in ${this.workingDir}`;
      let gitPromptServer;
      const env = {};
      if (useGitPromptServer) {
        gitPromptServer = new GitPromptServer();
        const {socket, electron, launcher, helper} = await gitPromptServer.start();
        env.GIT_ASKPASS = launcher;
        env.ATOM_GITHUB_ELECTRON_PATH = electron;
        env.ATOM_GITHUB_CREDENTIAL_HELPER_SCRIPT_PATH = helper;
        env.ATOM_GITHUB_CREDENTIAL_HELPER_SOCK_PATH = socket;
      }

      const options = {
        env,
        processCallback: child => {
          child.on('error', err => {
            console.error('Error executing: ' + formattedArgs);

            console.error(err.stack);
          });
          child.stdin.on('error', err => {
            console.error('Error writing to process: ' + formattedArgs);
            console.error(err.stack);
            console.error('Tried to write: ' + stdin);
          });
          if (gitPromptServer) {
            subscriptions.add(gitPromptServer.onDidCancel(() => {
              require('tree-kill')(child.pid);
            }));
          }
        },
      };

      if (stdin) {
        options.stdin = stdin;
        options.stdinEncoding = 'utf8';
      }

      if (process.env.PRINT_GIT_TIMES) {
        console.time(`git:${formattedArgs}`);
      }
      return GitProcess.exec(args, this.workingDir, options)
        .then(({stdout, stderr, exitCode}) => {
          if (process.env.PRINT_GIT_TIMES) {
            console.timeEnd(`git:${formattedArgs}`);
          }
          if (gitPromptServer) {
            gitPromptServer.terminate();
          }
          subscriptions.dispose();
          if (exitCode) {
            const err = new GitError(
              `${formattedArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`,
              stderr,
            );
            err.code = exitCode;
            err.command = formattedArgs;
            return Promise.reject(err);
          }
          return stdout;
        });
    });
    /* eslint-enable no-console */
  }

  /**
   * Execute a git command that may create a commit. If the command fails because the GPG binary was invoked and unable
   * to acquire a passphrase (because the pinentry program attempted to use a tty), retry with a `GitPromptServer`.
   */
  gpgExec(args, stdin = null) {
    const gpgArgs = withGpgScript(args);
    return this.exec(gpgArgs, stdin).catch(err => {
      if (err.code === 128 && /gpg failed/.test(err.stdErr)) {
        // Retry with a GitPromptServer
        return this.exec(gpgArgs, stdin, true);
      } else {
        throw err;
      }
    });
  }

  async isGitRepository() {
    try {
      await this.exec(['rev-parse', '--resolve-git-dir', path.join(this.workingDir, '.git')]);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Staging/Unstaging files and patches and committing
   */
  stageFiles(paths) {
    if (paths.length === 0) { return null; }
    const args = ['add'].concat(paths);
    return this.exec(args);
  }

  unstageFiles(paths, commit = 'HEAD') {
    if (paths.length === 0) { return null; }
    const args = ['reset', commit, '--'].concat(paths);
    return this.exec(args);
  }

  applyPatchToIndex(patch) {
    return this.exec(['apply', '--cached', '-'], patch);
  }

  commit(message, {allowEmpty, amend} = {}) {
    const args = ['commit', '-m', message];
    if (amend) { args.push('--amend'); }
    if (allowEmpty) { args.push('--allow-empty'); }
    return this.gpgExec(args);
  }

  /**
   * File Status and Diffs
   */
  async getStatusesForChangedFiles() {
    const output = await this.exec(['status', '--untracked-files=all', '-z']);

    const statusMap = {
      'A': 'added',
      'M': 'modified',
      'D': 'deleted',
      'U': 'modified',
      '?': 'added',
    };

    const stagedFiles = {};
    const unstagedFiles = {};
    const mergeConflictFiles = {};
    let statusToHead;

    if (output) {
      const lines = output.split('\0');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') { continue; }
        const [_, x, y, filePath] = line.match(/(.)(.)\s(.*)/); // eslint-disable-line no-unused-vars
        if (x === 'U' || y === 'U' || (x === 'A' && y === 'A')) {
          // Skipping this check here because we only run a single `await`
          // and we only run it in the main, synchronous body of the for loop.
          // eslint-disable-next-line babel/no-await-in-loop
          if (!statusToHead) { statusToHead = await this.diffFileStatus({target: 'HEAD'}); }
          mergeConflictFiles[filePath] = {
            ours: statusMap[x],
            theirs: statusMap[y],
            file: statusToHead[filePath] || 'equivalent',
          };
          continue;
        }
        if (x === 'R') {
          stagedFiles[filePath] = 'added';
          stagedFiles[lines[++i]] = 'deleted';
          continue;
        }
        if (y !== ' ') {
          unstagedFiles[filePath] = statusMap[y];
        }
        if (x !== ' ' && x !== '?') {
          stagedFiles[filePath] = statusMap[x];
        }
      }
    }

    return {stagedFiles, unstagedFiles, mergeConflictFiles};
  }

  async diffFileStatus(options = {}) {
    const args = ['diff', '--name-status', '--no-renames'];
    if (options.staged) { args.push('--staged'); }
    if (options.target) { args.push(options.target); }
    if (options.diffFilter === 'unmerged') { args.push('--diff-filter=U'); }
    const output = await this.exec(args);

    const statusMap = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
      U: 'unmerged',
    };

    const fileStatuses = {};
    output && output.trim().split(LINE_ENDING_REGEX).forEach(line => {
      const [status, filePath] = line.split('\t');
      fileStatuses[filePath] = statusMap[status];
    });
    if (!options.staged) {
      const untracked = await this.getUntrackedFiles();
      untracked.forEach(filePath => { fileStatuses[filePath] = 'added'; });
    }
    return fileStatuses;
  }

  async getUntrackedFiles() {
    const output = await this.exec(['ls-files', '--others', '--exclude-standard']);
    if (output.trim() === '') { return []; }
    return output.trim().split(LINE_ENDING_REGEX);
  }

  async getDiffForFilePath(filePath, {staged, baseCommit} = {}) {
    let args = ['diff', '--no-prefix', '--no-renames', '--diff-filter=u'];
    if (staged) { args.push('--staged'); }
    if (baseCommit) { args.push(baseCommit); }
    args = args.concat(['--', filePath]);
    const output = await this.exec(args);

    let rawDiffs = [];
    if (output) { rawDiffs = parseDiff(output).filter(rawDiff => rawDiff.status !== 'unmerged'); }

    if (!staged && (await this.getUntrackedFiles()).includes(filePath)) {
      // add untracked file
      const absPath = path.join(this.workingDir, filePath);
      const stats = await fsStat(absPath);
      const contents = await readFile(absPath);
      rawDiffs.push(buildAddedFilePatch(filePath, contents, stats));
    }
    if (rawDiffs.length > 1) { throw new Error(`Expected 0 or 1 diffs for ${filePath} but got ${rawDiffs.length}`); }
    return rawDiffs[0];
  }

  /**
   * Miscellaneous getters
   */
  async getCommit(ref) {
    const output = await this.exec(['log', '--pretty=%H%x00%B%x00', '--no-abbrev-commit', '-1', ref]);
    const [sha, message] = (output).split('\0');
    return {sha, message: message.trim()};
  }

  getHeadCommit() {
    return this.getCommit('HEAD');
  }

  readFileFromIndex(filePath) {
    return this.exec(['show', `:${filePath}`]);
  }

  /**
   * Merge
   */
  merge(branchName) {
    return this.gpgExec(['merge', branchName]);
  }

  async isMerging() {
    try {
      await readFile(path.join(this.workingDir, '.git', 'MERGE_HEAD'));
      return true;
    } catch (e) {
      return false;
    }
  }

  abortMerge() {
    return this.exec(['merge', '--abort']);
  }

  /**
   * Remote interactions
   */
  clone(remoteUrl, options = {}) {
    const args = ['clone', '--no-local', remoteUrl, this.workingDir];
    if (options.bare) { args.push('--bare'); }
    return this.exec(args);
  }

  async getRemoteForBranch(branchName) {
    try {
      const output = await this.exec(['config', `branch.${branchName}.remote`]);
      return output.trim();
    } catch (e) {
      return null;
    }
  }

  async fetch(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    return this.exec(['fetch', remote, branchName], null, true);
  }

  async pull(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    return this.gpgExec(['pull', remote, branchName], null, true);
  }

  async push(branchName, options = {}) {
    const remote = await this.getRemoteForBranch(branchName);
    const args = ['push', remote || 'origin', branchName];
    if (options.setUpstream) { args.push('--set-upstream'); }
    if (options.force) { args.push('--force'); }
    return this.exec(args, null, true);
  }

  async getAheadCount(branchName) {
    try {
      const pushTrackingBranch = await this.exec(['rev-parse', '--symbolic-full-name', `${branchName}@{push}`]);
      const output = await this.exec(['rev-list', `${pushTrackingBranch.trim()}..heads/${branchName}`]);
      return output.trim().split(LINE_ENDING_REGEX).filter(s => s.trim()).length;
    } catch (e) {
      return null;
    }
  }

  async getBehindCount(branchName) {
    try {
      const upstreamTrackingBranch = await this.exec(['rev-parse', '--symbolic-full-name', `${branchName}@{upstream}`]);
      const output = await this.exec(['rev-list', `heads/${branchName}..${upstreamTrackingBranch.trim()}`]);
      return output.trim().split(LINE_ENDING_REGEX).filter(s => s.trim()).length;
    } catch (e) {
      return null;
    }
  }

  /**
   * Branches
   */
  async getCurrentBranch() {
    const output = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
    return output.trim();
  }

  checkout(branchName, options = {}) {
    const args = ['checkout'];
    if (options.createNew) { args.push('-b'); }
    return this.exec(args.concat(branchName));
  }

  async checkoutFiles(paths, revision) {
    if (paths.length === 0) { return null; }
    try {
      const args = ['checkout'];
      if (revision) { args.push(revision); }
      return await this.exec(args.concat('--', paths));
    } catch (error) {
      const matches = error.stdErr.match(/error: pathspec .* did not match any file\(s\) known to git\./g);
      if (matches.length) {
        const filePaths = matches.map(line => {
          return line.match(/error: pathspec '(.*)' did not match any file\(s\) known to git\./)[1];
        });
        return Promise.all(filePaths.map(filePath => {
          const absPath = path.join(this.workingDir, filePath);
          return deleteFileOrFolder(absPath);
        }));
      } else {
        return Promise.resolve();
      }
    }
  }

  async getBranches() {
    const output = await this.exec(['branch']);
    return output.trim().split(LINE_ENDING_REGEX)
      .map(branchName => branchName.trim().replace(/^\* /, ''));
  }
}

function buildAddedFilePatch(filePath, contents, stats) {
  const hunks = [];
  if (contents) {
    const noNewLine = contents[contents.length - 1] !== '\n';
    const lines = contents.trim().split(LINE_ENDING_REGEX).map(line => `+${line}`);
    if (noNewLine) { lines.push('\\ No newline at end of file'); }
    hunks.push({
      lines,
      oldStartLine: 0,
      oldLineCount: 0,
      newStartLine: 1,
      heading: '',
      newLineCount: noNewLine ? lines.length - 1 : lines.length,
    });
  }
  const executable = Boolean((stats >> 6) && 1); // eslint-disable-line no-bitwise
  return {
    oldPath: null,
    newPath: filePath,
    oldMode: null,
    newMode: executable ? '100755' : '100644',
    status: 'added',
    hunks,
  };
}
