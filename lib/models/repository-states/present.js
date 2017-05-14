import path from 'path';

import State from './state';

import {deleteFileOrFolder} from '../../helpers';
import {FOCUS} from '../workspace-change-observer';
import FilePatch from '../file-patch';
import Hunk from '../hunk';
import HunkLine from '../hunk-line';
import DiscardHistory from '../discard-history';
import Branch from '../branch';
import Remote from '../remote';
import Commit from '../commit';

/**
 * Decorator for an async method that invalidates the cache after execution (regardless of success or failure).
 * Optionally parameterized by a function that accepts the same arguments as the function that returns the list of cache
 * keys to invalidate.
 */
function invalidate(spec) {
  return function(target, name, descriptor) {
    const original = descriptor.value;
    descriptor.value = function(...args) {
      return original.apply(this, args).then(
        result => {
          this.acceptInvalidation(spec, args);
          return result;
        },
        err => {
          this.acceptInvalidation(spec, args);
          return Promise.reject(err);
        },
      );
    };
    return descriptor;
  };
}

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
  }

  isPresent() {
    return true;
  }

  showStatusBarTiles() {
    return true;
  }

  acceptInvalidation(spec, args) {
    const keys = spec(...args);
    this.cache.invalidate(keys);
    this.didUpdate();
  }

  observeFilesystemChange(paths) {
    const keys = new Set();
    for (let i = 0; i < paths.length; i++) {
      const fullPath = paths[i];

      if (fullPath === FOCUS) {
        keys.add(Keys.changedFiles);
        for (const k of Keys.filePatch.eachWithOpts({staged: false})) {
          keys.add(k);
        }
        continue;
      }

      const endsWith = (...segments) => fullPath.endsWith(path.join(...segments));
      const includes = (...segments) => fullPath.includes(path.join(...segments));

      if (endsWith('.git', 'index')) {
        keys.add(Keys.changedFiles);
        keys.add(Keys.stagedChangesSinceParentCommit);
        keys.add(Keys.filePatch.all);
        keys.add(Keys.index.all);
        continue;
      }

      if (endsWith('.git', 'HEAD')) {
        keys.add(Keys.lastCommit);
        keys.add(Keys.currentBranch);
        keys.add(Keys.aheadCount.all);
        keys.add(Keys.behindCount.all);
        continue;
      }

      if (includes('.git', 'refs', 'heads')) {
        keys.add(Keys.branches);
        keys.add(Keys.lastCommit);
        continue;
      }

      if (includes('.git', 'refs', 'remotes')) {
        keys.add(Keys.remotes);
        continue;
      }

      if (endsWith('.git', 'config')) {
        keys.add(Keys.config.all);
        keys.add(Keys.aheadCount.all);
        keys.add(Keys.behindCount.all);
        continue;
      }

      // File change within the working directory
      const relativePath = path.relative(this.workdir(), fullPath);
      keys.add(Keys.changedFiles);
      keys.add(Keys.filePatch.oneWith(relativePath, {staged: false}));
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

  @invalidate(paths => Keys.cacheOperationKeys(paths))
  stageFiles(paths) {
    return this.git().stageFiles(paths);
  }

  @invalidate(paths => Keys.cacheOperationKeys(paths))
  unstageFiles(paths) {
    return this.git().unstageFiles(paths);
  }

  @invalidate(paths => Keys.cacheOperationKeys(paths))
  stageFilesFromParentCommit(paths) {
    return this.git().unstageFiles(paths, 'HEAD~');
  }

  @invalidate(filePatch => Keys.cacheOperationKeys([filePatch.getOldPath(), filePatch.getNewPath()]))
  applyPatchToIndex(filePatch) {
    const patchStr = filePatch.getHeaderString() + filePatch.toString();
    return this.git().applyPatch(patchStr, {index: true});
  }

  @invalidate(filePatch => Keys.workdirOperationKeys([filePatch.getOldPath(), filePatch.getNewPath()]))
  applyPatchToWorkdir(filePatch) {
    const patchStr = filePatch.getHeaderString() + filePatch.toString();
    return this.git().applyPatch(patchStr);
  }

  // Committing

  @invalidate(() => [
    ...Keys.headOperationKeys(),
    ...Keys.filePatch.eachWithOpts({staged: true}),
  ])
  commit(message, options) {
    return this.git().commit(formatCommitMessage(message), options);
  }

  // Merging

  @invalidate(() => [
    ...Keys.headOperationKeys(),
    Keys.index.all,
  ])
  merge(branchName) {
    return this.git().merge(branchName);
  }

  @invalidate(() => [
    Keys.changedFiles,
    Keys.stagedChangesSinceParentCommit,
    Keys.filePatch.all,
    Keys.index.all,
  ])
  abortMerge() {
    return this.git().abortMerge();
  }

  checkoutSide(side, paths) {
    return this.git().checkoutSide(side, paths);
  }

  mergeFile(oursPath, commonBasePath, theirsPath, resultPath) {
    return this.git().mergeFile(oursPath, commonBasePath, theirsPath, resultPath);
  }

  @invalidate(filePath => [
    Keys.changedFiles,
    Keys.stagedChangesSinceParentCommit,
    ...Keys.filePatch.eachWithFileOpts([filePath], [{staged: false}, {staged: true}, {staged: true, amending: true}]),
    Keys.index.oneWith(filePath),
  ])
  writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha) {
    return this.git().writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha);
  }

  // Checkout

  @invalidate(() => [
    Keys.stagedChangesSinceParentCommit,
    Keys.lastCommit,
    Keys.currentBranch,
    Keys.index.all,
    Keys.aheadCount.all,
    Keys.behindCount.all,
    ...Keys.filePatch.eachWithOpts({staged: true, amending: true}),
  ])
  checkout(revision, options = {}) {
    return this.git().checkout(revision, options);
  }

  @invalidate(paths => [
    Keys.changedFiles,
    Keys.stagedChangesSinceParentCommit,
    ...paths.map(fileName => Keys.index.oneWith(fileName)),
    ...Keys.filePatch.eachWithFileOpts(paths, [{staged: true}, {staged: true, amending: true}]),
  ])
  checkoutPathsAtRevision(paths, revision = 'HEAD') {
    return this.git().checkoutFiles(paths, revision);
  }

  // Remote interactions

  @invalidate(branchName => [
    Keys.aheadCount.oneWith(branchName),
    Keys.behindCount.oneWith(branchName),
  ])
  async fetch(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    if (!remote.isPresent()) {
      return;
    }
    await this.git().fetch(remote.getName(), branchName);
  }

  @invalidate(() => [
    ...Keys.headOperationKeys(),
    Keys.index.all,
  ])
  async pull(branchName) {
    const remote = await this.getRemoteForBranch(branchName);
    if (!remote.isPresent()) {
      return;
    }
    await this.git().pull(remote.getName(), branchName);
  }

  @invalidate((branchName, options = {}) => {
    const keys = [
      Keys.aheadCount.oneWith(branchName),
      Keys.behindCount.oneWith(branchName),
    ];

    if (options.setUpstream) {
      keys.push(...Keys.config.eachWithSetting(`branch.${branchName}.remote`));
    }

    return keys;
  })
  async push(branchName, options) {
    const remote = await this.getRemoteForBranch(branchName);
    return this.git().push(remote.getNameOr('origin'), branchName, options);
  }

  // Configuration

  @invalidate(setting => Keys.config.eachWithSetting(setting))
  setConfig(setting, value, options) {
    return this.git().setConfig(setting, value, options);
  }

  @invalidate(setting => Keys.config.eachWithSetting(setting))
  unsetConfig(setting) {
    return this.git().unsetConfig(setting);
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

  @invalidate(paths => [
    Keys.changedFiles,
    ...paths.map(filePath => Keys.filePatch.oneWith(filePath, {staged: false})),
  ])
  async discardWorkDirChangesForPaths(paths) {
    const untrackedFiles = await this.git().getUntrackedFiles();
    const [filesToRemove, filesToCheckout] = partition(paths, f => untrackedFiles.includes(f));
    await this.git().checkoutFiles(filesToCheckout);
    await Promise.all(filesToRemove.map(filePath => {
      const absPath = path.join(this.workdir(), filePath);
      return deleteFileOrFolder(absPath);
    }));
  }

  // Accessors /////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Index queries

  getStatusesForChangedFiles() {
    return this.cache.getOrSet(Keys.changedFiles, () => {
      return this.git().getStatusesForChangedFiles();
    });
  }

  getStagedChangesSinceParentCommit() {
    return this.cache.getOrSet(Keys.stagedChangesSinceParentCommit, async () => {
      try {
        const stagedFiles = await this.git().diffFileStatus({staged: true, target: 'HEAD~'});
        return Object.keys(stagedFiles).map(filePath => ({filePath, status: stagedFiles[filePath]}));
      } catch (e) {
        if (e.message.includes('ambiguous argument \'HEAD~\'')) {
          return [];
        } else {
          throw e;
        }
      }
    });
  }

  getFilePatchForPath(filePath, {staged, amending} = {staged: false, amending: false}) {
    return this.cache.getOrSet(Keys.filePatch.oneWith(filePath, {staged, amending}), async () => {
      const options = {staged, amending};
      if (amending) {
        options.baseCommit = 'HEAD~';
      }

      const rawDiff = await this.git().getDiffForFilePath(filePath, options);
      if (rawDiff) {
        const [filePatch] = buildFilePatchesFromRawDiffs([rawDiff]);
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
      const {sha, message, unbornRef} = await this.git().getHeadCommit();
      return unbornRef ? Commit.createUnborn() : new Commit(sha, message);
    });
  }

  // Branches

  getBranches() {
    return this.cache.getOrSet(Keys.branches, async () => {
      const branchNames = await this.git().getBranches();
      return branchNames.map(branchName => new Branch(branchName));
    });
  }

  getCurrentBranch() {
    return this.cache.getOrSet(Keys.currentBranch, async () => {
      const {name, isDetached} = await this.git().getCurrentBranch();
      return isDetached ? Branch.createDetached(name) : new Branch(name);
    });
  }

  // Merging and rebasing status

  isMerging() {
    return this.git().isMerging();
  }

  isRebasing() {
    return this.git().isRebasing();
  }

  // Remotes

  getRemotes() {
    return this.cache.getOrSet(Keys.remotes, async () => {
      const remotesInfo = await this.git().getRemotes();
      return remotesInfo.map(({name, url}) => new Remote(name, url));
    });
  }

  getAheadCount(branchName) {
    return this.cache.getOrSet(Keys.aheadCount.oneWith(branchName), () => {
      return this.git().getAheadCount(branchName);
    });
  }

  getBehindCount(branchName) {
    return this.cache.getOrSet(Keys.behindCount.oneWith(branchName), () => {
      return this.git().getBehindCount(branchName);
    });
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

function formatCommitMessage(message) {
  // strip out comments
  const messageWithoutComments = message.replace(/^#.*$/mg, '').trim();

  // hard wrap message (except for first line) at 72 characters
  let results = [];
  messageWithoutComments.split('\n').forEach((line, index) => {
    if (line.length <= 72 || index === 0) {
      results.push(line);
    } else {
      const matches = line.match(/.{1,72}(\s|$)|\S+?(\s|$)/g)
        .map(match => {
          return match.endsWith('\n') ? match.substr(0, match.length - 1) : match;
        });
      results = results.concat(matches);
    }
  });

  return results.join('\n');
}

function buildFilePatchesFromRawDiffs(rawDiffs) {
  let diffLineNumber = 0;
  return rawDiffs.map(patch => {
    const hunks = patch.hunks.map(hunk => {
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
    return new FilePatch(patch.oldPath, patch.newPath, patch.status, hunks);
  });
}

class Cache {
  constructor() {
    this.storage = new Map();
    this.byGroup = new Map();
  }

  getOrSet(key, operation) {
    const primary = key.getPrimary();
    const existing = this.storage.get(primary);
    if (existing !== undefined) {
      return existing;
    }

    const created = operation();

    this.storage.set(primary, created);

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

    return created;
  }

  invalidate(keys) {
    for (let i = 0; i < keys.length; i++) {
      keys[i].removeFromCache(this);
    }
  }

  keysInGroup(group) {
    return this.byGroup.get(group) || [];
  }

  removePrimary(primary) {
    this.storage.delete(primary);
  }

  removeFromGroup(group, key) {
    const groupSet = this.byGroup.get(group);
    groupSet && groupSet.delete(key);
  }

  clear() {
    this.storage.clear();
    this.byGroup.clear();
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
}

const Keys = {
  changedFiles: new CacheKey('changed-files'),

  stagedChangesSinceParentCommit: new CacheKey('staged-changes-since-parent-commit'),

  filePatch: {
    _optKey: ({staged, amending}) => {
      if (staged && amending) {
        return 'a';
      } else if (staged) {
        return 's';
      } else {
        return 'u';
      }
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

  branches: new CacheKey('branches'),

  currentBranch: new CacheKey('current-branch'),

  remotes: new CacheKey('remotes'),

  aheadCount: {
    oneWith: branchName => new CacheKey(`ahead-count:${branchName}`, ['ahead-count']),

    all: new GroupKey('ahead-count'),
  },

  behindCount: {
    oneWith: branchName => new CacheKey(`behind-count:${branchName}`, ['behind-count']),

    all: new GroupKey('behind-count'),
  },

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

  // Common collections of keys and patterns for use with @invalidate().

  workdirOperationKeys: fileNames => [
    Keys.changedFiles,
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: false}]),
  ],

  cacheOperationKeys: fileNames => [
    ...Keys.workdirOperationKeys(fileNames),
    ...Keys.filePatch.eachWithFileOpts(fileNames, [{staged: true}, {staged: true, amending: true}]),
    ...fileNames.map(Keys.index.oneWith),
    Keys.stagedChangesSinceParentCommit,
  ],

  headOperationKeys: () => [
    ...Keys.filePatch.eachWithOpts({staged: true, amending: true}),
    Keys.changedFiles,
    Keys.stagedChangesSinceParentCommit,
    Keys.lastCommit,
    Keys.aheadCount.all,
    Keys.behindCount.all,
  ],
};
