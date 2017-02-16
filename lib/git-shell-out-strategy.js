import path from 'path';
import os from 'os';

import {CompositeDisposable} from 'atom';

import {GitProcess} from 'git-kitchen-sink';
import {parse as parseDiff} from 'what-the-diff';
import Git from 'nodegit';

import GitPromptServer from './git-prompt-server';
import AsyncQueue from './async-queue';
import {readFile, writeFile, fsStat, deleteFileOrFolder} from './helpers';
import GitTimingsView from './views/git-timings-view';

const LINE_ENDING_REGEX = /\r?\n/;

const GPG_HELPER_PATH = path.resolve(__dirname, '..', 'bin', 'gpg-no-tty.sh');

export class GitError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
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
  static defaultExecArgs = {stdin: null, useGitPromptServer: false, writeOperation: false}

  constructor(workingDir, options = {}) {
    this.workingDir = workingDir;
    this.nodegit = Git.Repository.open(workingDir);
    const parallelism = options.parallelism || Math.max(3, os.cpus().length);
    this.commandQueue = new AsyncQueue({parallelism});
  }

  // Execute a command and read the output using the embedded Git environment
  exec(args, {stdin, useGitPromptServer, writeOperation} = GitShellOutStrategy.defaultExecArgs) {
    /* eslint-disable no-console */
    const subscriptions = new CompositeDisposable();

    const formattedArgs = `git ${args.join(' ')} in ${this.workingDir}`;
    const timingMarker = GitTimingsView.generateMarker(`git ${args.join(' ')}`);
    timingMarker.mark('queued');

    return this.commandQueue.push(async () => {
      timingMarker.mark('prepare');
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
      return new Promise(resolve => {
        timingMarker.mark('nexttick');
        setImmediate(() => {
          timingMarker.mark('execute');
          resolve(GitProcess.exec(args, this.workingDir, options)
            .then(({stdout, stderr, exitCode}) => {
              timingMarker.finalize();
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
                );
                err.code = exitCode;
                err.stdErr = stderr;
                err.stdOut = stdout;
                err.command = formattedArgs;
                return Promise.reject(err);
              }
              return stdout;
            }));
        });
      });
    }, {parallel: !writeOperation});
    /* eslint-enable no-console */
  }

  async execNodeGit(op, label = '<unknown>') {
    const timingMarker = GitTimingsView.generateMarker(label + ' (nodegit)');
    timingMarker.mark('queued');
    timingMarker.mark('prepare');
    timingMarker.mark('nexttick');
    timingMarker.mark('execute');
    const retVal = await op();
    timingMarker.finalize();
    return retVal;
  }

  /**
   * Execute a git command that may create a commit. If the command fails because the GPG binary was invoked and unable
   * to acquire a passphrase (because the pinentry program attempted to use a tty), retry with a `GitPromptServer`.
   */
  gpgExec(args, {stdin} = {stdin: null}) {
    const gpgArgs = withGpgScript(args);
    return this.exec(gpgArgs, {stdin, writeOperation: true}).catch(err => {
      if (err.code === 128 && /gpg failed/.test(err.stdErr)) {
        // Retry with a GitPromptServer
        return this.exec(gpgArgs, {stdin, useGitPromptServer: true, writeOperation: true});
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
    return this.exec(args, {writeOperation: true});
  }

  unstageFiles(paths, commit = 'HEAD') {
    if (paths.length === 0) { return null; }
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
    return this.execNodeGit(async () => {
      const stagedFiles = {};
      const unstagedFiles = {};
      const mergeConflictFiles = {};
      const repo = await this.nodegit;
      const statuses = await repo.getStatus();
      const STATUS = Git.Status.STATUS;
      const index = await repo.index();

      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const mask = status.statusBit();
        const filePath = status.path();
        if (mask & STATUS.INDEX_NEW) {
          stagedFiles[filePath] = 'added';
        }
        if (mask & STATUS.INDEX_MODIFIED || mask & STATUS.INDEX_TYPECHANGE) {
          stagedFiles[filePath] = 'modified';
        }
        if (mask & STATUS.INDEX_DELETED) {
          stagedFiles[filePath] = 'deleted';
        }
        if (mask & STATUS.INDEX_RENAMED) {
          console.warn('rename detected, check if handled correctly for staged filePath', filePath);
        }
        if (mask & STATUS.WT_NEW) {
          unstagedFiles[filePath] = 'added';
        }
        if (mask & STATUS.WT_MODIFIED || mask & STATUS.WT_TYPECHANGE) {
          unstagedFiles[filePath] = 'modified';
        }
        if (mask & STATUS.WT_DELETED) {
          unstagedFiles[filePath] = 'deleted';
        }
        if (mask & STATUS.WT_RENAMED) {
          console.warn('rename detected, check if handled correctly for unstaged filePath', filePath);
        }
        if (mask & STATUS.CONFLICTED) {
          const {ancestor_out: base, our_out: ours, their_out: theirs} = await index.conflictGet(filePath);
          if (!base && ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'added', theirs: 'added', file: 'modified'};
          } else if (base && ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'modified', theirs: 'modified', file: 'modified'};
          } else if (base && ours && !theirs) {
            mergeConflictFiles[filePath] = {ours: 'modified', theirs: 'deleted', file: 'equivalent'};
          } else if (base && !ours && theirs) {
            mergeConflictFiles[filePath] = {ours: 'deleted', theirs: 'modified', file: 'added'};
          } else {
            console.error('Unrecognized index state:', {base, ours, theirs});
          }
        }
      }
      return {stagedFiles, unstagedFiles, mergeConflictFiles};
    }, 'getStatusesForChangedFiles');
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

  async isPartiallyStaged(filePath) {
    const args = ['status', '--short', '--', filePath];
    const output = await this.exec(args, {writeOperation: true});
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
    return this.execNodeGit(async () => {
      const commit = await this._getCommitFromRevspec(ref);
      return {sha: commit.id().toString(), message: commit.message().trim()};
    }, 'getCommit');
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
    return this.exec(['merge', '--abort'], {writeOperation: true});
  }

  /**
   * Remote interactions
   */
  async clone(remoteUrl, options = {}) {
    const args = ['clone', '--no-local', remoteUrl, this.workingDir];
    if (options.bare) { args.push('--bare'); }
    const result = await this.exec(args, {writeOperation: true});
    this.nodegit = Git.Repository.open(this.workingDir);
    return result;
  }

  async getRemoteForBranch(branchName) {
    try {
      // const output = await this.exec(['config', `branch.${branchName}.remote`]);
      return await this.getConfig(`branch.${branchName}.remote`);
    } catch (e) {
      return null;
    }
  }

  async fetch(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    return this.exec(['fetch', remote, branchName], {useGitPromptServer: true, writeOperation: true});
  }

  async pull(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    return this.gpgExec(['pull', remote, branchName], {useGitPromptServer: true, writeOperation: true});
  }

  async push(branchName, options = {}) {
    const remote = await this.getRemoteForBranch(branchName);
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
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const ref = await repo.head();
      return ref.shorthand();
    }, 'getCurrentBranch');
  }

  checkout(branchName, options = {}) {
    const args = ['checkout'];
    if (options.createNew) { args.push('-b'); }
    return this.exec(args.concat(branchName), {writeOperation: true});
  }

  async checkoutFiles(paths, revision) {
    if (paths.length === 0) { return null; }
    try {
      const args = ['checkout'];
      if (revision) { args.push(revision); }
      return await this.exec(args.concat('--', paths), {writeOperation: true});
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
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const refs = await Git.Reference.list(repo);
      return refs
        .filter(ref => ref.startsWith('refs/heads/'))
        .map(ref => ref.substr(11));
    }, 'getBranches');
  }

  async getConfig(option, {local} = {}) {
    // TODO: non-local???
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const config = await repo.configSnapshot();
      try {
        return await config.getStringBuf(option);
      } catch (_e) {
        return null;
      }
    }, 'getConfig');
  }

  setConfig(option, value, {replaceAll} = {}) {
    let args = ['config', '--local'];
    if (replaceAll) { args.push('--replace-all'); }
    args = args.concat(option, value);
    return this.exec(args, {writeOperation: true});
  }

  async getRemotes() {
    // TODO: ??? how to make this node-git compat?
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
      output = await this.exec(['hash-object', '-w', filePath], {writeOperation: true});
    } else if (stdin) {
      output = await this.exec(['hash-object', '-w', '--stdin'], {stdin, writeOperation: true});
    } else {
      throw new Error('Must supply file path or stdin');
    }
    return output.trim();
  }

  async expandBlobToFile(absFilePath, sha) {
    const output = await this.getBlobContents(sha);
    await writeFile(absFilePath, output);
    return absFilePath;
  }

  async getBlobContents(sha) {
    return this.execNodeGit(async () => {
      const repo = await this.nodegit;
      const oid = Git.Oid.fromString(sha);
      const blob = await Git.Blob.lookup(repo, oid);
      return blob.toString();
    }, 'getBlobContents');
  }

  async mergeFile(currentPath, basePath, otherPath, resultPath) {
    const args = [
      'merge-file', '-p', currentPath, basePath, otherPath,
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
    await writeFile(resultPath, output);
    return {resultPath, conflict};
  }

  async _getOidFromRevspec(revspec) {
    const repo = await this.nodegit;
    // `revspec` might be a refspec with suffixes, etc.
    // so we use `fromRevspec` to get an annotated commit,
    // and from that the actual commit.
    const annotatedCommit = await Git.AnnotatedCommit.fromRevspec(repo, revspec);
    const oid = annotatedCommit.id();
    annotatedCommit.free();
    return oid;
  }

  async _getCommitFromRevspec(revspec) {
    const repo = await this.nodegit;
    const oid = await this._getOidFromRevspec(revspec);
    return Git.Commit.lookup(repo, oid);
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
