import path from 'path';

import {Emitter, Disposable} from 'atom';
import {autobind} from 'core-decorators';

import GitShellOutStrategy from '../git-shell-out-strategy';
import FilePatch from './file-patch';
import Hunk from './hunk';
import HunkLine from './hunk-line';
import FileDiscardHistory from './file-discard-history';
import {readFile} from '../helpers';

const MERGE_MARKER_REGEX = /^(>|<){7} \S+$/m;

export class AbortMergeError extends Error {
  constructor(code, filePath) {
    super();
    this.message = `${code}: ${filePath}.`;
    this.code = code;
    this.path = filePath;
    this.stack = new Error().stack;
  }
}

export class CommitError extends Error {
  constructor(code) {
    super();
    this.message = `Commit error: ${code}.`;
    this.code = code;
    this.stack = new Error().stack;
  }
}

export default class Repository {
  static async open(workingDirectoryPath, gitStrategy) {
    const strategy = gitStrategy || new GitShellOutStrategy(workingDirectoryPath);
    if (await strategy.isGitRepository()) {
      const historySha = await strategy.getConfig('atomGithub.historySha');
      const history = historySha ? JSON.parse(await strategy.getBlobContents(historySha)) : {};
      return new Repository(workingDirectoryPath, strategy, history);
    } else {
      return null;
    }
  }

  static githubInfoFromRemote(remote) {
    //             proto       login   domain         owner    repo
    const regex = /(?:.+:\/\/)?(?:.+@)?github\.com[:/]([^/]+)\/(.+)/;
    const match = remote.match(regex);
    if (match) {
      return {
        githubRepo: true,
        owner: match[1],
        name: match[2].replace(/\.git$/, ''),
      };
    } else {
      return {
        githubRepo: false,
        owner: null,
        name: null,
      };
    }
  }

  constructor(workingDirectoryPath, gitStrategy, history) {
    this.workingDirectoryPath = workingDirectoryPath;
    this.emitter = new Emitter();
    this.stagedFilePatchesByPath = new Map();
    this.stagedFilePatchesSinceParentCommitByPath = new Map();
    this.unstagedFilePatchesByPath = new Map();
    this.git = gitStrategy;
    this.destroyed = false;
    this.fileDiscardHistory = new FileDiscardHistory(
      this.createBlob,
      this.expandBlobToFile,
      this.mergeFile,
      this.setConfig,
    );
    if (history) { this.fileDiscardHistory.updateHistory(history); }
    const onWindowFocus = () => this.updateDiscardHistory();
    window.addEventListener('focus', onWindowFocus);
    this.windowFocusDisposable = new Disposable(() => window.removeEventListener('focus', onWindowFocus));
  }

  destroy() {
    this.destroyed = true;
    this.emitter.emit('did-destroy');
    this.emitter.dispose();
    this.windowFocusDisposable.dispose();
  }

  isDestroyed() {
    return this.destroyed;
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }

  didUpdate() {
    this.emitter.emit('did-update');
  }

  getWorkingDirectoryPath() {
    return this.workingDirectoryPath;
  }

  getGitDirectoryPath() {
    return path.join(this.getWorkingDirectoryPath(), '.git');
  }

  refresh() {
    /* eslint-disable no-console */
    this.clearCachedFilePatches();
    this.fileStatusesPromise = null;
    this.stagedChangesSinceParentCommitPromise = null;
    this.didUpdate();
    /* eslint-enable no-console */
  }

  fetchStatusesForChangedFiles() {
    return this.git.getStatusesForChangedFiles();
  }

  getStatusesForChangedFiles() {
    if (!this.fileStatusesPromise) {
      this.fileStatusesPromise = this.fetchStatusesForChangedFiles();
    }
    return this.fileStatusesPromise;
  }

  async getUnstagedChanges() {
    const {unstagedFiles} = await this.getStatusesForChangedFiles();
    return Object.keys(unstagedFiles).map(filePath => { return {filePath, status: unstagedFiles[filePath]}; });
  }

  async getStagedChanges() {
    const {stagedFiles} = await this.getStatusesForChangedFiles();
    return Object.keys(stagedFiles).map(filePath => { return {filePath, status: stagedFiles[filePath]}; });
  }

  async getMergeConflicts() {
    const {mergeConflictFiles} = await this.getStatusesForChangedFiles();
    return Object.keys(mergeConflictFiles).map(filePath => {
      return {filePath, status: mergeConflictFiles[filePath]};
    });
  }

  async fetchStagedChangesSinceParentCommit() {
    try {
      const stagedFiles = await this.git.diffFileStatus({staged: true, target: 'HEAD~'});
      return Object.keys(stagedFiles).map(filePath => { return {filePath, status: stagedFiles[filePath]}; });
    } catch (e) {
      if (e.message.includes('ambiguous argument \'HEAD~\'')) {
        return [];
      } else {
        throw e;
      }
    }
  }

  getStagedChangesSinceParentCommit() {
    if (!this.stagedChangesSinceParentCommitPromise) {
      this.stagedChangesSinceParentCommitPromise = this.fetchStagedChangesSinceParentCommit();
    }
    return this.stagedChangesSinceParentCommitPromise;
  }

  clearCachedFilePatches() {
    this.stagedFilePatchesByPath = new Map();
    this.stagedFilePatchesSinceParentCommitByPath = new Map();
    this.unstagedFilePatchesByPath = new Map();
  }

  isPartiallyStaged(filePath) {
    return this.git.isPartiallyStaged(filePath);
  }

  getCachedFilePatchForPath(filePath, {staged, amending} = {}) {
    if (staged && amending) {
      return this.stagedFilePatchesSinceParentCommitByPath.get(filePath);
    } else if (staged) {
      return this.stagedFilePatchesByPath.get(filePath);
    } else {
      return this.unstagedFilePatchesByPath.get(filePath);
    }
  }

  cacheFilePatchForPath(filePath, filePatch, {staged, amending} = {}) {
    if (staged && amending) {
      this.stagedFilePatchesSinceParentCommitByPath.set(filePath, filePatch);
    } else if (staged) {
      this.stagedFilePatchesByPath.set(filePath, filePatch);
    } else {
      this.unstagedFilePatchesByPath.set(filePath, filePatch);
    }
  }

  async getFilePatchForPath(filePath, options = {}) {
    const cachedFilePatch = this.getCachedFilePatchForPath(filePath, options);
    if (cachedFilePatch) { return cachedFilePatch; }

    if (options.amending) { options.baseCommit = 'HEAD~'; }
    const rawDiff = await this.git.getDiffForFilePath(filePath, options);
    if (rawDiff) {
      const [filePatch] = this.buildFilePatchesFromRawDiffs([rawDiff]);
      this.cacheFilePatchForPath(filePath, filePatch, options);
      return filePatch;
    } else {
      return null;
    }
  }

  buildFilePatchesFromRawDiffs(rawDiffs) {
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

  async stageFiles(paths) {
    await this.git.stageFiles(paths);
  }

  async unstageFiles(paths) {
    await this.git.unstageFiles(paths);
  }

  async stageFilesFromParentCommit(paths) {
    await this.git.unstageFiles(paths, 'HEAD~');
  }

  async applyPatchToIndex(filePatch) {
    const patchStr = filePatch.getHeaderString() + filePatch.toString();
    await this.git.applyPatch(patchStr, {index: true});
  }

  async applyPatchToWorkdir(filePatch) {
    const patchStr = filePatch.getHeaderString() + filePatch.toString();
    await this.git.applyPatch(patchStr);
  }

  async checkoutPathsAtRevision(paths, revision = 'HEAD') {
    await this.git.checkoutFiles(paths, revision);
  }

  async pathHasMergeMarkers(relativePath) {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), relativePath), 'utf8');
      return MERGE_MARKER_REGEX.test(contents);
    } catch (e) {
      if (e.code === 'ENOENT') { return false; } else { throw e; }
    }
  }

  getMergeHead() {
    return this.git.getMergeHead();
  }

  async getMergeMessage() {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), '.git', 'MERGE_MSG'), 'utf8');
      return contents;
    } catch (e) {
      return null;
    }
  }

  async abortMerge() {
    await this.git.abortMerge();
    return this.refresh();
  }

  isMerging() {
    return this.git.isMerging();
  }

  async commit(message, options) {
    await this.git.commit(this.formatCommitMessage(message), options);
    this.stagedChangesPromise = null;
    this.stagedChangesSinceParentCommitPromise = null;
  }

  getLastCommit() {
    return this.git.getHeadCommit();
  }

  formatCommitMessage(message) {
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

  readFileFromIndex(filePath) {
    return this.git.readFileFromIndex(filePath);
  }

  push(branchName, options) {
    return this.git.push(branchName, options);
  }

  fetch(branchName) {
    return this.git.fetch(branchName);
  }

  pull(branchName) {
    return this.git.pull(branchName);
  }

  getAheadCount(branchName) {
    return this.git.getAheadCount(branchName);
  }

  getBehindCount(branchName) {
    return this.git.getBehindCount(branchName);
  }

  getRemoteForBranch(branchName) {
    return this.git.getRemoteForBranch(branchName);
  }

  getCurrentBranch() {
    return this.git.getCurrentBranch();
  }

  getBranches() {
    return this.git.getBranches();
  }

  getRemotes() {
    return this.git.getRemotes();
  }

  getConfig(configOption, options) {
    return this.git.getConfig(configOption, options);
  }

  @autobind
  setConfig(configOption, configValue, options) {
    return this.git.setConfig(configOption, configValue, options);
  }

  async checkout(branchName, options) {
    await this.git.checkout(branchName, options);
  }

  setCommitState(state) {
    this.commitState = state;
  }

  getCommitState() {
    return this.commitState;
  }

  @autobind
  createBlob(options = {}) {
    return this.git.createBlob(options);
  }

  @autobind
  expandBlobToFile(absFilePath, sha) {
    return this.git.expandBlobToFile(absFilePath, sha);
  }

  @autobind
  getBlobContents(sha) {
    return this.git.getBlobContents(sha);
  }

  @autobind
  mergeFile(currentPath, basePath, otherPath, resultPath) {
    return this.git.mergeFile(currentPath, basePath, otherPath, resultPath);
  }

  storeBeforeAndAfterBlobs(filePath, isSafe, destructiveAction, {partial} = {}) {
    return this.fileDiscardHistory.storeBlobs(filePath, isSafe, destructiveAction, partial);
  }

  undoLastDiscardInTempFile(filePath, isSafe, {partial} = {}) {
    return this.fileDiscardHistory.undoLastDiscardInTempFile(filePath, isSafe, partial);
  }

  popUndoHistoryForFilePath(filePath) {
    return this.fileDiscardHistory.popUndoHistoryForFilePath(filePath);
  }

  hasUndoHistory(filePath, {partial} = {}) {
    return this.fileDiscardHistory.hasUndoHistory(filePath, partial);
  }

  async updateDiscardHistory() {
    const historySha = await this.git.getConfig('atomGithub.historySha');
    const history = historySha ? JSON.parse(await this.git.getBlobContents(historySha)) : {};
    this.fileDiscardHistory.updateHistory(history);
  }

  clearPartialDiscardHistoryForPath(filePath) {
    return this.fileDiscardHistory.clearPartialDiscardHistoryForPath(filePath);
  }

  clearFileDiscardHistory() {
    return this.fileDiscardHistory.clearFileDiscardHistory();
  }

  @autobind
  getPartialDiscardUndoHistoryForPath(filePath) {
    return this.fileDiscardHistory.getPartialDiscardUndoHistoryForPath(filePath);
  }

  async discardWorkDirChangesForPaths(paths) {
    await this.git.checkoutFiles(paths);
  }
}
