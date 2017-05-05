import path from 'path';
import os from 'os';
import {remote} from 'electron';

import {CompositeDisposable} from 'event-kit';
import {GitProcess} from 'dugite';
import {parse as parseDiff} from 'what-the-diff';

import GitPromptServer from './git-prompt-server';
import AsyncQueue from './async-queue';
import {
  getPackageRoot, getDugitePath,
  readFile, fileExists, fsStat, writeFile, isFileExecutable,
  normalizeGitHelperPath,
} from './helpers';
import GitTimingsView from './views/git-timings-view';
import WorkerManager from './worker-manager';

const LINE_ENDING_REGEX = /\r?\n/;

const GPG_HELPER_PATH = path.resolve(getPackageRoot(), 'bin', 'gpg-no-tty.sh');

let headless = null;

export class GitError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.stack = new Error().stack;
  }
}

export default class GitShellOutStrategy {
  static defaultExecArgs = {stdin: null, useGitPromptServer: false, writeOperation: false}

  constructor(workingDir, options = {}) {
    this.workingDir = workingDir;
    if (options.queue) {
      this.commandQueue = options.queue;
    } else {
      const parallelism = options.parallelism || Math.max(3, os.cpus().length);
      this.commandQueue = new AsyncQueue({parallelism});
    }

    this.prompt = options.prompt || (query => Promise.reject());
    this.workerManager = options.workerManager;

    if (headless === null) {
      headless = !remote.getCurrentWindow().isVisible();
    }
  }

  /*
   * Provide an asynchronous callback to be used to request input from the user for git operations.
   *
   * `prompt` must be a callable that accepts a query object `{prompt, includeUsername}` and returns a Promise
   * that either resolves with a result object `{[username], password}` or rejects on cancellation.
   */
  setPromptCallback(prompt) {
    this.prompt = prompt;
  }

  // Execute a command and read the output using the embedded Git environment
  exec(args, {stdin, useGitPromptServer, writeOperation} = GitShellOutStrategy.defaultExecArgs) {
    /* eslint-disable no-console */
    const subscriptions = new CompositeDisposable();
    const diagnosticsEnabled = process.env.ATOM_GITHUB_GIT_DIAGNOSTICS || atom.config.get('github.gitDiagnostics');

    const formattedArgs = `git ${args.join(' ')} in ${this.workingDir}`;
    const timingMarker = GitTimingsView.generateMarker(`git ${args.join(' ')}`);
    timingMarker.mark('queued');

    return this.commandQueue.push(async () => {
      timingMarker.mark('prepare');
      let gitPromptServer;

      const env = {
        GIT_TERMINAL_PROMPT: '0',
      };

      if (useGitPromptServer) {
        gitPromptServer = new GitPromptServer();
        const {
          socket, electron, credentialHelper, askPass, sshWrapper,
        } = await gitPromptServer.start(this.prompt);

        env.ATOM_GITHUB_ASKPASS_PATH = normalizeGitHelperPath(askPass.script);
        env.ATOM_GITHUB_CREDENTIAL_PATH = normalizeGitHelperPath(credentialHelper.script);
        env.ATOM_GITHUB_ELECTRON_PATH = normalizeGitHelperPath(electron);
        env.ATOM_GITHUB_SOCK_PATH = normalizeGitHelperPath(socket);

        env.ATOM_GITHUB_WORKDIR_PATH = this.workingDir;
        env.ATOM_GITHUB_DUGITE_PATH = getDugitePath();

        // "ssh" won't respect SSH_ASKPASS unless:
        // (a) it's running without a tty
        // (b) DISPLAY is set to something nonempty
        // But, on a Mac, DISPLAY is unset. Ensure that it is so our SSH_ASKPASS is respected.
        if (!process.env.DISPLAY || process.env.DISPLAY.length === 0) {
          env.DISPLAY = 'atom-github-placeholder';
        }

        env.ATOM_GITHUB_ORIGINAL_PATH = process.env.PATH || '';
        env.ATOM_GITHUB_ORIGINAL_GIT_ASKPASS = process.env.GIT_ASKPASS || '';
        env.ATOM_GITHUB_ORIGINAL_SSH_ASKPASS = process.env.SSH_ASKPASS || '';
        env.ATOM_GITHUB_ORIGINAL_GIT_SSH_COMMAND = process.env.GIT_SSH_COMMAND || '';
        env.ATOM_GITHUB_SPEC_MODE = atom.inSpecMode() ? 'true' : 'false';

        env.SSH_ASKPASS = normalizeGitHelperPath(askPass.launcher);
        env.GIT_ASKPASS = normalizeGitHelperPath(askPass.launcher);

        if (process.platform === 'linux') {
          env.GIT_SSH_COMMAND = sshWrapper.script;
        } else {
          env.GIT_SSH_COMMAND = process.env.GIT_SSH_COMMAND;
        }

        args.unshift('-c', `credential.helper=${normalizeGitHelperPath(credentialHelper.launcher)}`);
      }

      if (diagnosticsEnabled) {
        env.GIT_TRACE = 'true';
        env.GIT_TRACE_CURL = 'true';
      }

      const options = {env};

      if (stdin) {
        options.stdin = stdin;
        options.stdinEncoding = 'utf8';
      }

      if (process.env.PRINT_GIT_TIMES) {
        console.time(`git:${formattedArgs}`);
      }
      return new Promise(async (resolve, reject) => {
        const {promise, cancel} = this.executeGitCommand(args, options, timingMarker);
        let expectCancel = false;
        if (gitPromptServer) {
          subscriptions.add(gitPromptServer.onDidCancel(() => {
            expectCancel = true;
            cancel();
          }));
        }

        const {stdout, stderr, exitCode, timing} = await promise;

        if (timing) {
          const {execTime, spawnTime, ipcTime} = timing;
          const now = performance.now();
          timingMarker.mark('nexttick', now - execTime - spawnTime - ipcTime);
          timingMarker.mark('execute', now - execTime - ipcTime);
          timingMarker.mark('ipc', now - ipcTime);
        }
        timingMarker.finalize();
        if (process.env.PRINT_GIT_TIMES) {
          console.timeEnd(`git:${formattedArgs}`);
        }
        if (gitPromptServer) {
          gitPromptServer.terminate();
        }
        subscriptions.dispose();

        if (diagnosticsEnabled) {
          if (headless) {
            let summary = `git:${formattedArgs}\n`;
            summary += `exit status: ${exitCode}\n`;
            summary += 'stdout:';
            if (stdout.length === 0) {
              summary += ' <empty>\n';
            } else {
              summary += `\n${stdout}\n`;
            }
            summary += 'stderr:';
            if (stderr.length === 0) {
              summary += ' <empty>\n';
            } else {
              summary += `\n${stderr}\n`;
            }

            console.log(summary);
          } else {
            const headerStyle = 'font-weight: bold; color: blue;';

            console.groupCollapsed(`git:${formattedArgs}`);
            console.log('%cexit status%c %d', headerStyle, 'font-weight: normal; color: black;', exitCode);
            console.log('%cstdout', headerStyle);
            console.log(stdout);
            console.log('%cstderr', headerStyle);
            console.log(stderr);
            console.groupEnd();
          }
        }

        if (exitCode !== 0 && !expectCancel) {
          const err = new GitError(
            `${formattedArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`,
          );
          err.code = exitCode;
          err.stdErr = stderr;
          err.stdOut = stdout;
          err.command = formattedArgs;
          reject(err);
        }
        resolve(stdout);
      });
    }, {parallel: !writeOperation});
    /* eslint-enable no-console */
  }

  executeGitCommand(args, options, marker = null) {
    if (process.env.ATOM_GITHUB_INLINE_GIT_EXEC || !WorkerManager.getInstance().isReady()) {
      marker && marker.mark('nexttick');

      let childPid;
      options.processCallback = child => {
        childPid = child.pid;

        child.on('error', err => {
          /* eslint-disable no-console */
          console.error(`Error spawning: git ${args.join(' ')} in ${this.workingDir}`);
          console.error(err);
          /* eslint-enable no-console */
        });

        child.stdin.on('error', err => {
          /* eslint-disable no-console */
          console.error(`Error writing to stdin: git ${args.join(' ')} in ${this.workingDir}\n${options.stdin}`);
          console.error(err);
          /* eslint-enable no-console */
        });
      };

      const promise = GitProcess.exec(args, this.workingDir, options);
      marker && marker.mark('execute');
      return {
        promise,
        cancel: () => childPid && require('tree-kill')(childPid),
      };
    } else {
      const workerManager = this.workerManager || WorkerManager.getInstance();
      return workerManager.request({
        args,
        workingDir: this.workingDir,
        options,
      });
    }
  }

  /**
   * Execute a git command that may create a commit. If the command fails because the GPG binary was invoked and unable
   * to acquire a passphrase (because the pinentry program attempted to use a tty), retry with a `GitPromptServer`.
   */
  gpgExec(args, options = {}) {
    const gpgArgs = ['-c', `gpg.program=${GPG_HELPER_PATH}`].concat(args);
    return this.exec(gpgArgs, options).catch(err => {
      if (err.code === 128 && /gpg failed/.test(err.stdErr) && !options.useGitPromptServer) {
        // Retry with a GitPromptServer
        options.useGitPromptServer = true;
        return this.exec(gpgArgs, options);
      } else {
        throw err;
      }
    });
  }

  async isGitRepository() {
    try {
      await fsStat(this.workingDir); // fails if folder doesn't exist
      await this.exec(['rev-parse', '--resolve-git-dir', path.join(this.workingDir, '.git')]);
      return true;
    } catch (e) {
      return false;
    }
  }

  init() {
    return this.exec(['init', this.workingDir]);
  }

  /**
   * Staging/Unstaging files and patches and committing
   */
  stageFiles(paths) {
    if (paths.length === 0) { return Promise.resolve(null); }
    const args = ['add'].concat(paths);
    return this.exec(args, {writeOperation: true});
  }

  unstageFiles(paths, commit = 'HEAD') {
    if (paths.length === 0) { return Promise.resolve(null); }
    const args = ['reset', commit, '--'].concat(paths);
    return this.exec(args, {writeOperation: true});
  }

  applyPatch(patch, {index} = {}) {
    const args = ['apply', '-'];
    if (index) { args.splice(1, 0, '--cached'); }
    return this.exec(args, {stdin: patch, writeOperation: true});
  }

  commit(message, {allowEmpty, amend} = {}) {
    const args = ['commit', '-m', message];
    if (amend) { args.push('--amend'); }
    if (allowEmpty) { args.push('--allow-empty'); }
    return this.gpgExec(args, {writeOperation: true});
  }

  /**
   * File Status and Diffs
   */
  async getStatusesForChangedFiles() {
    const output = await this.exec(['status', '--untracked-files=all', '-z']);

    const statusMap = {
      'A': 'added',
      'C': 'added', // technically copied, but we'll treat as added
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
          // eslint-disable-next-line no-await-in-loop
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
        if (x === 'C') {
          // skip the next line, which is the copied file
          i++;
        }
      }
    }

    return {stagedFiles, unstagedFiles, mergeConflictFiles};
  }

  async diffFileStatus(options = {}) {
    const args = ['diff', '--name-status', '--no-renames'];
    if (options.staged) { args.push('--staged'); }
    if (options.target) { args.push(options.target); }
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
      const executable = await isFileExecutable(absPath);
      const contents = await readFile(absPath);
      rawDiffs.push(buildAddedFilePatch(filePath, contents, executable));
    }
    if (rawDiffs.length > 1) { throw new Error(`Expected 0 or 1 diffs for ${filePath} but got ${rawDiffs.length}`); }
    return rawDiffs[0];
  }

  async isPartiallyStaged(filePath) {
    const args = ['status', '--short', '--', filePath];
    const output = await this.exec(args);
    const results = output.trim().split(LINE_ENDING_REGEX);
    if (results.length === 2) {
      return true;
    } else if (results.length === 1) {
      return ['MM', 'AM', 'MD'].includes(results[0].slice(0, 2));
    } else {
      throw new Error(`Unexpected output for ${args.join(' ')}: ${output}`);
    }
  }

  /**
   * Miscellaneous getters
   */
  async getCommit(ref) {
    const output = await this.exec(['log', '--pretty=%H%x00%B%x00', '--no-abbrev-commit', '-1', ref]);
    const [sha, message] = (output).split('\0');
    return {sha, message: message.trim(), unbornRef: false};
  }

  async getHeadCommit() {
    try {
      const commit = await this.getCommit('HEAD');
      commit.unbornRef = false;
      return commit;
    } catch (e) {
      if (/unknown revision/.test(e.stdErr)) {
        return {sha: '', message: '', unbornRef: true};
      } else {
        throw e;
      }
    }
  }

  readFileFromIndex(filePath) {
    return this.exec(['show', `:${filePath}`]);
  }

  /**
   * Merge
   */
  merge(branchName) {
    return this.gpgExec(['merge', branchName], {writeOperation: true});
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
    return this.exec(['merge', '--abort'], {writeOperation: true});
  }

  checkoutSide(side, paths) {
    if (paths.length === 0) {
      return Promise.resolve();
    }

    return this.exec(['checkout', `--${side}`, ...paths]);
  }

  /**
   * Rebase
   */
  async isRebasing() {
    const results = await Promise.all([
      fileExists(path.join(this.workingDir, '.git', 'rebase-merge')),
      fileExists(path.join(this.workingDir, '.git', 'rebase-apply')),
    ]);
    return results.some(r => r);
  }

  /**
   * Remote interactions
   */
  clone(remoteUrl, options = {}) {
    const args = ['clone'];
    if (options.noLocal) { args.push('--no-local'); }
    if (options.bare) { args.push('--bare'); }
    if (options.recursive) { args.push('--recursive'); }
    args.push(remoteUrl, this.workingDir);

    return this.exec(args, {writeOperation: true});
  }

  fetch(remote, branchName) {
    return this.exec(['fetch', remote, branchName], {useGitPromptServer: true, writeOperation: true});
  }

  pull(remote, branchName) {
    return this.gpgExec(['pull', remote, branchName], {useGitPromptServer: true, writeOperation: true});
  }

  push(remote, branchName, options = {}) {
    const args = ['push', remote || 'origin', branchName];
    if (options.setUpstream) { args.push('--set-upstream'); }
    if (options.force) { args.push('--force'); }
    return this.exec(args, {useGitPromptServer: true, writeOperation: true});
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
    try {
      // The common case: you're on a branch
      return {
        name: (await this.exec(['symbolic-ref', '--short', 'HEAD'])).trim(),
        isDetached: false,
      };
    } catch (e) {
      if (!/not a symbolic ref/.test(e.stdErr)) {
        throw e;
      }

      // Detached HEAD
      return {
        name: (await this.exec(['describe', '--contains', '--all', 'HEAD'])).trim(),
        isDetached: true,
      };
    }
  }

  checkout(branchName, options = {}) {
    const args = ['checkout'];
    if (options.createNew) { args.push('-b'); }
    return this.exec(args.concat(branchName), {writeOperation: true});
  }

  checkoutFiles(paths, revision) {
    if (paths.length === 0) { return null; }
    const args = ['checkout'];
    if (revision) { args.push(revision); }
    return this.exec(args.concat('--', paths), {writeOperation: true});
  }

  async getBranches() {
    const output = await this.exec(['for-each-ref', '--format=%(refname:short)', 'refs/heads/*']);
    return output.trim().split(LINE_ENDING_REGEX);
  }

  async getConfig(option, {local} = {}) {
    let output;
    try {
      let args = ['config'];
      if (local) { args.push('--local'); }
      args = args.concat(option);
      output = await this.exec(args);
    } catch (err) {
      if (err.code === 1) {
        // No matching config found
        return null;
      } else {
        throw err;
      }
    }

    return output.trim();
  }

  setConfig(option, value, {replaceAll} = {}) {
    let args = ['config'];
    if (replaceAll) { args.push('--replace-all'); }
    args = args.concat(option, value);
    return this.exec(args, {writeOperation: true});
  }

  unsetConfig(option) {
    return this.exec(['config', '--unset', option], {writeOperation: true});
  }

  async getRemotes() {
    let output = await this.getConfig(['--get-regexp', '^remote..*.url$'], {local: true});
    if (output) {
      output = output.trim();
      if (!output.length) { return []; }
      return output.split('\n').map(line => {
        const match = line.match(/^remote\.(.*)\.url (.*)$/);
        return {
          name: match[1],
          url: match[2],
        };
      });
    } else {
      return [];
    }
  }

  async createBlob({filePath, stdin} = {}) {
    let output;
    if (filePath) {
      try {
        output = (await this.exec(['hash-object', '-w', filePath], {writeOperation: true})).trim();
      } catch (e) {
        if (e.stdErr && e.stdErr.match(/fatal: Cannot open .*: No such file or directory/)) {
          output = null;
        } else {
          throw e;
        }
      }
    } else if (stdin) {
      output = (await this.exec(['hash-object', '-w', '--stdin'], {stdin, writeOperation: true})).trim();
    } else {
      throw new Error('Must supply file path or stdin');
    }
    return output;
  }

  async expandBlobToFile(absFilePath, sha) {
    const output = await this.exec(['cat-file', '-p', sha]);
    await writeFile(absFilePath, output);
    return absFilePath;
  }

  async getBlobContents(sha) {
    return await this.exec(['cat-file', '-p', sha]);
  }

  async mergeFile(oursPath, commonBasePath, theirsPath, resultPath) {
    const args = [
      'merge-file', '-p', oursPath, commonBasePath, theirsPath,
      '-L', 'current', '-L', 'after discard', '-L', 'before discard',
    ];
    let output;
    let conflict = false;
    try {
      output = await this.exec(args);
    } catch (e) {
      if (e instanceof GitError && e.code === 1) {
        output = e.stdOut;
        conflict = true;
      } else {
        throw e;
      }
    }

    // Interpret a relative resultPath as relative to the repository working directory for consistency with the
    // other arguments.
    const resolvedResultPath = path.resolve(this.workingDir, resultPath);
    await writeFile(resolvedResultPath, output);

    return {filePath: oursPath, resultPath, conflict};
  }

  async writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha) {
    const fileMode = await this.getFileMode(filePath);
    let indexInfo = `0 0000000000000000000000000000000000000000\t${filePath}\n`;
    if (commonBaseSha) { indexInfo += `${fileMode} ${commonBaseSha} 1\t${filePath}\n`; }
    if (oursSha) { indexInfo += `${fileMode} ${oursSha} 2\t${filePath}\n`; }
    if (theirsSha) { indexInfo += `${fileMode} ${theirsSha} 3\t${filePath}\n`; }
    return this.exec(['update-index', '--index-info'], {stdin: indexInfo, writeOperation: true});
  }

  async getFileMode(filePath) {
    const output = await this.exec(['ls-files', '--stage', '--', filePath]);
    if (output) {
      return output.slice(0, 6);
    } else {
      const executable = await isFileExecutable(path.join(this.workingDir, filePath));
      return executable ? '100755' : '100644';
    }
  }

  destroy() {
    this.commandQueue.dispose();
  }
}

function buildAddedFilePatch(filePath, contents, executable) {
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
  return {
    oldPath: null,
    newPath: filePath,
    oldMode: null,
    newMode: executable ? '100755' : '100644',
    status: 'added',
    hunks,
  };
}
