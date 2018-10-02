import path from 'path';
import {Emitter} from 'event-kit';
import fs from 'fs-extra';

import State from './state';

import {LargeRepoError} from '../../git-shell-out-strategy';
import {FOCUS} from '../workspace-change-observer';
import FilePatch from '../file-patch';
import Hunk from '../hunk';
import HunkLine from '../hunk-line';
import DiscardHistory from '../discard-history';
import Branch, {nullBranch} from '../branch';
import Author from '../author';
import BranchSet from '../branch-set';
import Remote from '../remote';
import RemoteSet from '../remote-set';
import Commit from '../commit';
import OperationStates from '../operation-states';
import {addEvent} from '../../reporter-proxy';

/**
 * State used when the working directory contains a valid git repository and can be interacted with. Performs
 * actual git operations, caching the results, and broadcasts `onDidUpdate` events when write actions are
 * performed.
 */
export default class Present extends State {
  constructor(repository, history) {
    super(repository);

    this.cache = new Cache();

    this.discardHistory = new DiscardHistory(
      this.createBlob.bind(this),
      this.expandBlobToFile.bind(this),
      this.mergeFile.bind(this),
      this.workdir(),
      {maxHistoryLength: 60},
    );

    this.operationStates = new OperationStates({didUpdate: this.didUpdate.bind(this)});

    this.commitMessage = '';
    this.setCommitMessageFromTemplate();

    if (history) {
      this.discardHistory.updateHistory(history);
    }
  }

  setCommitMessage(message) {
    this.commitMessage = message;
  }

  getCommitMessage() {
    return this.commitMessage;
  }

  async setCommitMessageFromTemplate() {
    const message = await this.getCommitMessageFromTemplate();
    if (!message) {
      return;
    }
    this.setCommitMessage(message)
    this.didUpdate()
  }

  async getCommitMessageFromTemplate() {
    return await this.git().getCommitMessageFromTemplate();
  }

  getOperationStates() {
    return this.operationStates;
  }

  isPresent() {
    return true;
  }

  destroy() {
    this.cache.destroy();
    super.destroy();
  }

  showStatusBarTiles() {
    return true;
  }

  acceptInvalidation(spec) {
    this.cache.invalidate(spec());
    this.didUpdate();
  }

  observeFilesystemChange(paths) {
    const keys = new Set();
    for (let i = 0; i < paths.length; i++) {
      const fullPath = paths[i];

      if (fullPath === FOCUS) {
        keys.add(Keys.statusBundle);
        for (const k of Keys.filePatch.eachWithOpts({staged: false})) {
          keys.add(k);
        }
        continue;
      }

      const endsWith = (...segments) => fullPath.endsWith(path.join(...segments));
      const includes = (...segments) => fullPath.includes(path.join(...segments));

      if (endsWith('.git', 'index')) {
        keys.add(Keys.stagedChangesSinceParentCommit);
        keys.add(Keys.filePatch.all);
        keys.add(Keys.index.all);
        keys.add(Keys.statusBundle);
        continue;
      }

      if (endsWith('.git', 'HEAD')) {
        keys.add(Keys.branches);
        keys.add(Keys.lastCommit);
        keys.add(Keys.recentCommits);
        keys.add(Keys.statusBundle);
        keys.add(Keys.headDescription);
        keys.add(Keys.authors);
        continue;
      }

      if (includes('.git', 'refs', 'heads')) {
        keys.add(Keys.branches);
        keys.add(Keys.lastCommit);
        keys.add(Keys.recentCommits);
        keys.add(Keys.headDescription);
        keys.add(Keys.authors);
        continue;
      }

      if (includes('.git', 'refs', 'remotes')) {
        keys.add(Keys.remotes);
        keys.add(Keys.statusBundle);
        keys.add(Keys.headDescription);
        continue;
      }

      if (endsWith('.git', 'config')) {
        keys.add(Keys.config.all);
        keys.add(Keys.statusBundle);
        continue;
      }

      // File change within the working directory
      const relativePath = path.relative(this.workdir(), fullPath);
      keys.add(Keys.filePatch.oneWith(relativePath, {staged: false}));
      keys.add(Keys.statusBundle);
    }

    if (keys.size > 0) {
      this.cache.invalidate(Array.from(keys));
      this.didUpdate();
    }
  }

  refresh() {
    this.cache.clear();
    this.didUpdate();
  }

  init() {
    return super.init().catch(e => {
      e.stdErr = 'This directory already contains a git repository';
      return Promise.reject(e);
    });
  }

  clone() {
    return super.clone().catch(e => {
      e.stdErr = 'This directory already contains a git repository';
      return Promise.reject(e);
    });
  }

  // Git operations ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Staging and unstaging

  stageFiles(paths) {
    return this.invalidate(
      () => Keys.cacheOperationKeys(paths),
      () => this.git().stageFiles(paths),
    );
  }

  unstageFiles(paths) {
    return this.invalidate(
      () => Keys.cacheOperationKeys(paths),
      () => this.git().unstageFiles(paths),
    );
  }

  stageFilesFromParentCommit(paths) {
    return this.invalidate(
      () => Keys.cacheOperationKeys(paths),
      () => this.git().unstageFiles(paths, 'HEAD~'),
    );
  }

  stageFileModeChange(filePath, fileMode) {
    return this.invalidate(
      () => Keys.cacheOperationKeys([filePath]),
      () => this.git().stageFileModeChange(filePath, fileMode),
    );
  }

  stageFileSymlinkChange(filePath) {
    return this.invalidate(
      () => Keys.cacheOperationKeys([filePath]),
      () => this.git().stageFileSymlinkChange(filePath),
    );
  }

  applyPatchToIndex(filePatch) {
    return this.invalidate(
      () => Keys.cacheOperationKeys([filePatch.getOldPath(), filePatch.getNewPath()]),
      () => {
        const patchStr = filePatch.toString();
        return this.git().applyPatch(patchStr, {index: true});
      },
    );
  }

  applyPatchToWorkdir(filePatch) {
    return this.invalidate(
      () => Keys.workdirOperationKeys([filePatch.getOldPath(), filePatch.getNewPath()]),
      () => {
        const patchStr = filePatch.toString();
        return this.git().applyPatch(patchStr);
      },
    );
  }

  // Committing

  commit(message, options) {
    return this.invalidate(
      () => [
        ...Keys.headOperationKeys(),
        ...Keys.filePatch.eachWithOpts({staged: true}),
        Keys.headDescription,
        Keys.branches,
      ],
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('COMMIT', async (message, options = {}) => {
        const coAuthors = options.coAuthors;
        const opts = !coAuthors ? options : {
          ...options,
          coAuthors: coAuthors.map(author => {
            return {email: author.getEmail(), name: author.getFullName()};
          }),
        };

        await this.git().commit(message, opts);

        // Collect commit metadata metrics
        // note: in GitShellOutStrategy we have counters for all git commands, including `commit`, but here we have
        //       access to additional metadata (unstaged file count) so it makes sense to collect commit events here
        const {unstagedFiles, mergeConflictFiles} = await this.getStatusesForChangedFiles();
        const unstagedCount = Object.keys({...unstagedFiles, ...mergeConflictFiles}).length;
        addEvent('commit', {
          package: 'github',
          partial: unstagedCount > 0,
          amend: !!options.amend,
          coAuthorCount: coAuthors ? coAuthors.length : 0,
        });
      }, message, options),
    );
  }

  // Merging

  merge(branchName) {
    return this.invalidate(
      () => [
        ...Keys.headOperationKeys(),
        Keys.index.all,
        Keys.headDescription,
      ],
      () => this.git().merge(branchName),
    );
  }

  abortMerge() {
    return this.invalidate(
      () => [
        Keys.statusBundle,
        Keys.stagedChangesSinceParentCommit,
        Keys.filePatch.all,
        Keys.index.all,
      ],
      () => this.git().abortMerge(),
    );
  }

  checkoutSide(side, paths) {
    return this.git().checkoutSide(side, paths);
  }

  mergeFile(oursPath, commonBasePath, theirsPath, resultPath) {
    return this.git().mergeFile(oursPath, commonBasePath, theirsPath, resultPath);
  }

  writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha) {
    return this.invalidate(
      () => [
        Keys.statusBundle,
        Keys.stagedChangesSinceParentCommit,
        ...Keys.filePatch.eachWithFileOpts([filePath], [{staged: false}, {staged: true}]),
        Keys.index.oneWith(filePath),
      ],
      () => this.git().writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha),
    );
  }

  // Checkout

  checkout(revision, options = {}) {
    return this.invalidate(
      () => [
        Keys.stagedChangesSinceParentCommit,
        Keys.lastCommit,
        Keys.recentCommits,
        Keys.authors,
        Keys.statusBundle,
        Keys.index.all,
        ...Keys.filePatch.eachWithOpts({staged: true}),
        Keys.headDescription,
        Keys.branches,
      ],
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('CHECKOUT', (revision, options) => {
        return this.git().checkout(revision, options);
      }, revision, options),
    );
  }

  checkoutPathsAtRevision(paths, revision = 'HEAD') {
    return this.invalidate(
      () => [
        Keys.statusBundle,
        Keys.stagedChangesSinceParentCommit,
        ...paths.map(fileName => Keys.index.oneWith(fileName)),
        ...Keys.filePatch.eachWithFileOpts(paths, [{staged: true}]),
      ],
      () => this.git().checkoutFiles(paths, revision),
    );
  }

  // Reset

  undoLastCommit() {
    return this.invalidate(
      () => [
        Keys.stagedChangesSinceParentCommit,
        Keys.lastCommit,
        Keys.recentCommits,
        Keys.authors,
        Keys.statusBundle,
        Keys.index.all,
        ...Keys.filePatch.eachWithOpts({staged: true}),
        Keys.headDescription,
      ],
      async () => {
        try {
          await this.git().reset('soft', 'HEAD~');
          addEvent('undo-last-commit', {package: 'github'});
        } catch (e) {
          if (/unknown revision/.test(e.stdErr)) {
            // Initial commit
            await this.git().deleteRef('HEAD');
          } else {
            throw e;
          }
        }
      },
    );
  }

  // Remote interactions

  fetch(branchName, options = {}) {
    return this.invalidate(
      () => [
        Keys.statusBundle,
        Keys.headDescription,
      ],
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('FETCH', async branchName => {
        let finalRemoteName = options.remoteName;
        if (!finalRemoteName) {
          const remote = await this.getRemoteForBranch(branchName);
          if (!remote.isPresent()) {
            return null;
          }
          finalRemoteName = remote.getName();
        }
        return this.git().fetch(finalRemoteName, branchName);
      }, branchName),
    );
  }

  pull(branchName, options = {}) {
    return this.invalidate(
      () => [
        ...Keys.headOperationKeys(),
        Keys.index.all,
        Keys.headDescription,
        Keys.branches,
      ],
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('PULL', async branchName => {
        let finalRemoteName = options.remoteName;
        if (!finalRemoteName) {
          const remote = await this.getRemoteForBranch(branchName);
          if (!remote.isPresent()) {
            return null;
          }
          finalRemoteName = remote.getName();
        }
        return this.git().pull(finalRemoteName, branchName, options);
      }, branchName),
    );
  }

  push(branchName, options = {}) {
    return this.invalidate(
      () => {
        const keys = [
          Keys.statusBundle,
          Keys.headDescription,
        ];

        if (options.setUpstream) {
          keys.push(Keys.branches);
          keys.push(...Keys.config.eachWithSetting(`branch.${branchName}.remote`));
        }

        return keys;
      },
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('PUSH', async (branchName, options) => {
        const remote = options.remote || await this.getRemoteForBranch(branchName);
        return this.git().push(remote.getNameOr('origin'), branchName, options);
      }, branchName, options),
    );
  }

  // Configuration

  setConfig(setting, value, options) {
    return this.invalidate(
      () => Keys.config.eachWithSetting(setting),
      () => this.git().setConfig(setting, value, options),
    );
  }

  unsetConfig(setting) {
    return this.invalidate(
      () => Keys.config.eachWithSetting(setting),
      () => this.git().unsetConfig(setting),
    );
  }

  // Direct blob interactions

  createBlob(options) {
    return this.git().createBlob(options);
  }

  expandBlobToFile(absFilePath, sha) {
    return this.git().expandBlobToFile(absFilePath, sha);
  }

  // Discard history

  createDiscardHistoryBlob() {
    return this.discardHistory.createHistoryBlob();
  }

  async updateDiscardHistory() {
    const history = await this.loadHistoryPayload();
    this.discardHistory.updateHistory(history);
  }

  async storeBeforeAndAfterBlobs(filePaths, isSafe, destructiveAction, partialDiscardFilePath = null) {
    const snapshots = await this.discardHistory.storeBeforeAndAfterBlobs(
      filePaths,
      isSafe,
      destructiveAction,
      partialDiscardFilePath,
    );
    if (snapshots) {
      await this.saveDiscardHistory();
    }
    return snapshots;
  }

  restoreLastDiscardInTempFiles(isSafe, partialDiscardFilePath = null) {
    return this.discardHistory.restoreLastDiscardInTempFiles(isSafe, partialDiscardFilePath);
  }

  async popDiscardHistory(partialDiscardFilePath = null) {
    const removed = await this.discardHistory.popHistory(partialDiscardFilePath);
    if (removed) {
      await this.saveDiscardHistory();
    }
  }

  clearDiscardHistory(partialDiscardFilePath = null) {
    this.discardHistory.clearHistory(partialDiscardFilePath);
    return this.saveDiscardHistory();
  }

  discardWorkDirChangesForPaths(paths) {
    return this.invalidate(
      () => [
        Keys.statusBundle,
        ...paths.map(filePath => Keys.filePatch.oneWith(filePath, {staged: false})),
      ],
      async () => {
        const untrackedFiles = await this.git().getUntrackedFiles();
        const [filesToRemove, filesToCheckout] = partition(paths, f => untrackedFiles.includes(f));
        await this.git().checkoutFiles(filesToCheckout);
        await Promise.all(filesToRemove.map(filePath => {
          const absPath = path.join(this.workdir(), filePath);
          return fs.remove(absPath);
        }));
      },
    );
  }

  // Accessors /////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Index queries

  getStatusBundle() {
    return this.cache.getOrSet(Keys.statusBundle, async () => {
      try {
        const bundle = await this.git().getStatusBundle();
        const results = await this.formatChangedFiles(bundle);
        results.branch = bundle.branch;
        if (!results.branch.aheadBehind) {
          results.branch.aheadBehind = {ahead: null, behind: null};
        }
        return results;
      } catch (err) {
        if (err instanceof LargeRepoError) {
          this.transitionTo('TooLarge');
          return {
            branch: {},
            stagedFiles: {},
            unstagedFiles: {},
            mergeConflictFiles: {},
          };
        } else {
          throw err;
        }
      }
    });
  }

  async formatChangedFiles({changedEntries, untrackedEntries, renamedEntries, unmergedEntries}) {
    const statusMap = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
      U: 'modified',
      T: 'typechange',
    };

    const stagedFiles = {};
    const unstagedFiles = {};
    const mergeConflictFiles = {};

    changedEntries.forEach(entry => {
      if (entry.stagedStatus) {
        stagedFiles[entry.filePath] = statusMap[entry.stagedStatus];
      }
      if (entry.unstagedStatus) {
        unstagedFiles[entry.filePath] = statusMap[entry.unstagedStatus];
      }
    });

    untrackedEntries.forEach(entry => {
      unstagedFiles[entry.filePath] = statusMap.A;
    });

    renamedEntries.forEach(entry => {
      if (entry.stagedStatus === 'R') {
        stagedFiles[entry.filePath] = statusMap.A;
        stagedFiles[entry.origFilePath] = statusMap.D;
      }
      if (entry.unstagedStatus === 'R') {
        unstagedFiles[entry.filePath] = statusMap.A;
        unstagedFiles[entry.origFilePath] = statusMap.D;
      }
      if (entry.stagedStatus === 'C') {
        stagedFiles[entry.filePath] = statusMap.A;
      }
      if (entry.unstagedStatus === 'C') {
        unstagedFiles[entry.filePath] = statusMap.A;
      }
    });

    let statusToHead;

    for (let i = 0; i < unmergedEntries.length; i++) {
      const {stagedStatus, unstagedStatus, filePath} = unmergedEntries[i];
      if (stagedStatus === 'U' || unstagedStatus === 'U' || (stagedStatus === 'A' && unstagedStatus === 'A')) {
        // Skipping this check here because we only run a single `await`
        // and we only run it in the main, synchronous body of the for loop.
        // eslint-disable-next-line no-await-in-loop
        if (!statusToHead) { statusToHead = await this.git().diffFileStatus({target: 'HEAD'}); }
        mergeConflictFiles[filePath] = {
          ours: statusMap[stagedStatus],
          theirs: statusMap[unstagedStatus],
          file: statusToHead[filePath] || 'equivalent',
        };
      }
    }

    return {stagedFiles, unstagedFiles, mergeConflictFiles};
  }

  async getStatusesForChangedFiles() {
    const {stagedFiles, unstagedFiles, mergeConflictFiles} = await this.getStatusBundle();
    return {stagedFiles, unstagedFiles, mergeConflictFiles};
  }

  getFilePatchForPath(filePath, {staged} = {staged: false}) {
    return this.cache.getOrSet(Keys.filePatch.oneWith(filePath, {staged}), async () => {
      const rawDiffs = await this.git().getDiffsForFilePath(filePath, {staged});
      if (rawDiffs.length > 0) {
        const filePatch = buildFilePatchFromRawDiffs(rawDiffs);
        return filePatch;
      } else {
        return null;
      }
    });
  }

  readFileFromIndex(filePath) {
    return this.cache.getOrSet(Keys.index.oneWith(filePath), () => {
      return this.git().readFileFromIndex(filePath);
    });
  }

  // Commit access

  getLastCommit() {
    return this.cache.getOrSet(Keys.lastCommit, async () => {
      const headCommit = await this.git().getHeadCommit();
      return headCommit.unbornRef ? Commit.createUnborn() : new Commit(headCommit);
    });
  }

  getRecentCommits(options) {
    return this.cache.getOrSet(Keys.recentCommits, async () => {
      const commits = await this.git().getCommits({ref: 'HEAD', ...options});
      return commits.map(commit => new Commit(commit));
    });
  }

  // Author information

  getAuthors(options) {
    // For now we'll do the naive thing and invalidate anytime HEAD moves. This ensures that we get new authors
    // introduced by newly created commits or pulled commits.
    // This means that we are constantly re-fetching data. If performance becomes a concern we can optimize
    return this.cache.getOrSet(Keys.authors, async () => {
      const authorMap = await this.git().getAuthors(options);
      return Object.keys(authorMap).map(email => new Author(email, authorMap[email]));
    });
  }

  // Branches

  getBranches() {
    return this.cache.getOrSet(Keys.branches, async () => {
      const payloads = await this.git().getBranches();
      const branches = new BranchSet();
      for (const payload of payloads) {
        let upstream = nullBranch;
        if (payload.upstream) {
          upstream = payload.upstream.remoteName
            ? Branch.createRemoteTracking(
              payload.upstream.trackingRef,
              payload.upstream.remoteName,
              payload.upstream.remoteRef,
            )
            : new Branch(payload.upstream.trackingRef);
        }

        let push = upstream;
        if (payload.push) {
          push = payload.push.remoteName
            ? Branch.createRemoteTracking(
              payload.push.trackingRef,
              payload.push.remoteName,
              payload.push.remoteRef,
            )
            : new Branch(payload.push.trackingRef);
        }

        branches.add(new Branch(payload.name, upstream, push, payload.head, {sha: payload.sha}));
      }
      return branches;
    });
  }

  getHeadDescription() {
    return this.cache.getOrSet(Keys.headDescription, () => {
      return this.git().describeHead();
    });
  }

  // Merging and rebasing status

  isMerging() {
    return this.git().isMerging(this.repository.getGitDirectoryPath());
  }

  isRebasing() {
    return this.git().isRebasing(this.repository.getGitDirectoryPath());
  }

  // Remotes

  getRemotes() {
    return this.cache.getOrSet(Keys.remotes, async () => {
      const remotesInfo = await this.git().getRemotes();
      return new RemoteSet(
        remotesInfo.map(({name, url}) => new Remote(name, url)),
      );
    });
  }

  addRemote(name, url) {
    return this.invalidate(
      () => [
        ...Keys.config.eachWithSetting(`remote.${name}.url`),
        ...Keys.config.eachWithSetting(`remote.${name}.fetch`),
        Keys.remotes,
      ],
      // eslint-disable-next-line no-shadow
      () => this.executePipelineAction('ADDREMOTE', async (name, url) => {
        await this.git().addRemote(name, url);
        return new Remote(name, url);
      }, name, url),
    );
  }

  async getAheadCount(branchName) {
    const bundle = await this.getStatusBundle();
    return bundle.branch.aheadBehind.ahead;
  }

  async getBehindCount(branchName) {
    const bundle = await this.getStatusBundle();
    return bundle.branch.aheadBehind.behind;
  }

  getConfig(option, {local} = {local: false}) {
    return this.cache.getOrSet(Keys.config.oneWith(option, {local}), () => {
      return this.git().getConfig(option, {local});
    });
  }

  // Direct blob access

  getBlobContents(sha) {
    return this.cache.getOrSet(Keys.blob(sha), () => {
      return this.git().getBlobContents(sha);
    });
  }

  // Discard history

  hasDiscardHistory(partialDiscardFilePath = null) {
    return this.discardHistory.hasHistory(partialDiscardFilePath);
  }

  getDiscardHistory(partialDiscardFilePath = null) {
    return this.discardHistory.getHistory(partialDiscardFilePath);
  }

  getLastHistorySnapshots(partialDiscardFilePath = null) {
    return this.discardHistory.getLastSnapshots(partialDiscardFilePath);
  }

  // Cache

  getCache() {
    return this.cache;
  }

  invalidate(spec, body) {
    return body().then(
      result => {
        this.acceptInvalidation(spec);
        return result;
      },
      err => {
        this.acceptInvalidation(spec);
        return Promise.reject(err);
      },
    );
  }
}

State.register(Present);

function partition(array, predicate) {
  const matches = [];
  const nonmatches = [];
  array.forEach(item => {
    if (predicate(item)) {
      matches.push(item);
    } else {
      nonmatches.push(item);
    }
  });
  return [matches, nonmatches];
}

function buildHunksFromDiff(diff) {
  let diffLineNumber = 0;
  return diff.hunks.map(hunk => {
    let oldLineNumber = hunk.oldStartLine;
    let newLineNumber = hunk.newStartLine;
    const hunkLines = hunk.lines.map(line => {
      const status = HunkLine.statusMap[line[0]];
      const text = line.slice(1);
      let hunkLine;
      if (status === 'unchanged') {
        hunkLine = new HunkLine(text, status, oldLineNumber, newLineNumber, diffLineNumber++);
        oldLineNumber++;
        newLineNumber++;
      } else if (status === 'added') {
        hunkLine = new HunkLine(text, status, -1, newLineNumber, diffLineNumber++);
        newLineNumber++;
      } else if (status === 'deleted') {
        hunkLine = new HunkLine(text, status, oldLineNumber, -1, diffLineNumber++);
        oldLineNumber++;
      } else if (status === 'nonewline') {
        hunkLine = new HunkLine(text.substr(1), status, -1, -1, diffLineNumber++);
      } else {
        throw new Error(`unknow status type: ${status}`);
      }
      return hunkLine;
    });
    return new Hunk(
      hunk.oldStartLine,
      hunk.newStartLine,
      hunk.oldLineCount,
      hunk.newLineCount,
      hunk.heading,
      hunkLines,
    );
  });
}

function buildFilePatchFromSingleDiff(rawDiff) {
  const wasSymlink = rawDiff.oldMode === '120000';
  const isSymlink = rawDiff.newMode === '120000';
  const diff = rawDiff;
  const hunks = buildHunksFromDiff(diff);
  let oldFile, newFile;
  if (wasSymlink && !isSymlink) {
    const symlink = diff.hunks[0].lines[0].slice(1);
    oldFile = new FilePatch.File({path: diff.oldPath, mode: diff.oldMode, symlink});
    newFile = new FilePatch.File({path: diff.newPath, mode: diff.newMode, symlink: null});
  } else if (!wasSymlink && isSymlink) {
    const symlink = diff.hunks[0].lines[0].slice(1);
    oldFile = new FilePatch.File({path: diff.oldPath, mode: diff.oldMode, symlink: null});
    newFile = new FilePatch.File({path: diff.newPath, mode: diff.newMode, symlink});
  } else if (wasSymlink && isSymlink) {
    const oldSymlink = diff.hunks[0].lines[0].slice(1);
    const newSymlink = diff.hunks[0].lines[2].slice(1);
    oldFile = new FilePatch.File({path: diff.oldPath, mode: diff.oldMode, symlink: oldSymlink});
    newFile = new FilePatch.File({path: diff.newPath, mode: diff.newMode, symlink: newSymlink});
  } else {
    oldFile = new FilePatch.File({path: diff.oldPath, mode: diff.oldMode, symlink: null});
    newFile = new FilePatch.File({path: diff.newPath, mode: diff.newMode, symlink: null});
  }
  const patch = new FilePatch.Patch({status: diff.status, hunks});
  return new FilePatch(oldFile, newFile, patch);
}

function buildFilePatchFromDualDiffs(diff1, diff2) {
  let modeChangeDiff, contentChangeDiff;
  if (diff1.oldMode === '120000' || diff1.newMode === '120000') {
    modeChangeDiff = diff1;
    contentChangeDiff = diff2;
  } else {
    modeChangeDiff = diff2;
    contentChangeDiff = diff1;
  }
  const hunks = buildHunksFromDiff(contentChangeDiff);
  const filePath = contentChangeDiff.oldPath || contentChangeDiff.newPath;
  const symlink = modeChangeDiff.hunks[0].lines[0].slice(1);
  let oldFile, newFile, status;
  if (modeChangeDiff.status === 'added') {
    oldFile = new FilePatch.File({path: filePath, mode: contentChangeDiff.oldMode, symlink: null});
    newFile = new FilePatch.File({path: filePath, mode: modeChangeDiff.newMode, symlink});
    status = 'deleted'; // contents were deleted and replaced with symlink
  } else if (modeChangeDiff.status === 'deleted') {
    oldFile = new FilePatch.File({path: filePath, mode: modeChangeDiff.oldMode, symlink});
    newFile = new FilePatch.File({path: filePath, mode: contentChangeDiff.newMode, symlink: null});
    status = 'added'; // contents were added after symlink was deleted
  } else {
    throw new Error(`Invalid mode change diff status: ${modeChangeDiff.status}`);
  }
  const patch = new FilePatch.Patch({status, hunks});
  return new FilePatch(oldFile, newFile, patch);
}

function buildFilePatchFromRawDiffs(rawDiffs) {
  if (rawDiffs.length === 1) {
    return buildFilePatchFromSingleDiff(rawDiffs[0]);
  } else if (rawDiffs.length === 2) {
    return buildFilePatchFromDualDiffs(rawDiffs[0], rawDiffs[1]);
  } else {
    throw new Error(`Unexpected number of diffs: ${rawDiffs.length}`);
  }
}

class Cache {
  constructor() {
    this.storage = new Map();
    this.byGroup = new Map();

    this.emitter = new Emitter();
  }

  getOrSet(key, operation) {
    const primary = key.getPrimary();
    const existing = this.storage.get(primary);
    if (existing !== undefined) {
      existing.hits++;
      return existing.promise;
    }

    const created = operation();

    this.storage.set(primary, {
      createdAt: performance.now(),
      hits: 0,
      promise: created,
    });

    const groups = key.getGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      let groupSet = this.byGroup.get(group);
      if (groupSet === undefined) {
        groupSet = new Set();
        this.byGroup.set(group, groupSet);
      }
      groupSet.add(key);
    }

    this.didUpdate();

    return created;
  }

  invalidate(keys) {
    for (let i = 0; i < keys.length; i++) {
      keys[i].removeFromCache(this);
    }

    if (keys.length > 0) {
      this.didUpdate();
    }
  }

  keysInGroup(group) {
    return this.byGroup.get(group) || [];
  }

  removePrimary(primary) {
    this.storage.delete(primary);
    this.didUpdate();
  }

  removeFromGroup(group, key) {
    const groupSet = this.byGroup.get(group);
    groupSet && groupSet.delete(key);
    this.didUpdate();
  }

  [Symbol.iterator]() {
    return this.storage[Symbol.iterator]();
  }

  clear() {
    this.storage.clear();
    this.byGroup.clear();
    this.didUpdate();
  }

  didUpdate() {
    this.emitter.emit('did-update');
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }

  destroy() {
    this.emitter.dispose();
  }
}

class CacheKey {
  constructor(primary, groups = []) {
    this.primary = primary;
    this.groups = groups;
  }

  getPrimary() {
    return this.primary;
  }

  getGroups() {
    return this.groups;
  }

  removeFromCache(cache, withoutGroup = null) {
    cache.removePrimary(this.getPrimary());

    const groups = this.getGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group === withoutGroup) {
        continue;
      }

      cache.removeFromGroup(group, this);
    }
  }

  toString() {
    return `CacheKey(${this.primary})`;
  }
}

class GroupKey {
  constructor(group) {
    this.group = group;
  }

  removeFromCache(cache) {
    for (const matchingKey of cache.keysInGroup(this.group)) {
      matchingKey.removeFromCache(cache, this.group);
    }
  }

  toString() {
    return `GroupKey(${this.group})`;
  }
}

const Keys = {
  statusBundle: new CacheKey('status-bundle'),

  stagedChangesSinceParentCommit: new CacheKey('staged-changes-since-parent-commit'),

  filePatch: {
    _optKey: ({staged}) => {
      return staged ? 's' : 'u';
    },

    oneWith: (fileName, options) => { // <-- Keys.filePatch
      const optKey = Keys.filePatch._optKey(options);
      return new CacheKey(`file-patch:${optKey}:${fileName}`, [
        'file-patch',
        `file-patch:${optKey}`,
      ]);
    },

    eachWithFileOpts: (fileNames, opts) => {
      const keys = [];
      for (let i = 0; i < fileNames.length; i++) {
        for (let j = 0; j < opts.length; j++) {
          keys.push(Keys.filePatch.oneWith(fileNames[i], opts[j]));
        }
      }
      return keys;
    },

    eachWithOpts: (...opts) => opts.map(opt => new GroupKey(`file-patch:${Keys.filePatch._optKey(opt)}`)),

    all: new GroupKey('file-patch'),
  },

  index: {
    oneWith: fileName => new CacheKey(`index:${fileName}`, ['index']),

    all: new GroupKey('index'),
  },

  lastCommit: new CacheKey('last-commit'),

  recentCommits: new CacheKey('recent-commits'),

  authors: new CacheKey('authors'),

  branches: new CacheKey('branches'),

  headDescription: new CacheKey('head-description'),

  remotes: new CacheKey('remotes'),

  config: {
    _optKey: options => (options.local ? 'l' : ''),

    oneWith: (setting, options) => {
      const optKey = Keys.config._optKey(options);
      return new CacheKey(`config:${optKey}:${setting}`, ['config', `config:${optKey}`]);
    },

    eachWithSetting: setting => [
      Keys.config.oneWith(setting, {local: true}),
      Keys.config.oneWith(setting, {local: false}),
    ],

    all: new GroupKey('config'),
  },

  blob: {
    oneWith: sha => `blob:${sha}`,
  },

  // Common collections of keys and patterns for use with invalidate().

  workdirOperationKeys: fileNames => [
    Keys.statusBundle,
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: false}]),
  ],

  cacheOperationKeys: fileNames => [
    ...Keys.workdirOperationKeys(fileNames),
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: true}]),
    ...fileNames.map(Keys.index.oneWith),
    Keys.stagedChangesSinceParentCommit,
  ],

  headOperationKeys: () => [
    ...Keys.filePatch.eachWithOpts({staged: true}),
    Keys.stagedChangesSinceParentCommit,
    Keys.lastCommit,
    Keys.recentCommits,
    Keys.authors,
    Keys.statusBundle,
  ],
};
