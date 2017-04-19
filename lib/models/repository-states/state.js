import {nullCommit} from '../commit';
import {nullBranch} from '../branch';

export const expectedDelegates = [];

/**
 * Map of registered subclasses to allow states to transition to one another without circular dependencies.
 * Subclasses of State should call `State.register` to add themselves here.
 */
const stateConstructors = new Map();

/**
 * Methods marked with this decorator on State should be delegated from a Repository to its current state. This will
 * be verified by a unit test in `repository.test.js`.
 */
function shouldDelegate(target, name, descriptor) {
  expectedDelegates.push(name);
  return descriptor;
}

/**
 * Base class for Repository states. Implements default "null" behavior.
 */
export default class State {
  constructor(repository) {
    this.repository = repository;
  }

  static register(Subclass) {
    stateConstructors.set(Subclass.name, Subclass);
  }

  // This state has just been entered. Perform any asynchronous initialization that needs to occur.
  start() {
    return Promise.resolve();
  }

  // State probe predicates ////////////////////////////////////////////////////////////////////////////////////////////
  // Allow external callers to identify which state a Repository is in if necessary.

  @shouldDelegate
  isUndetermined() {
    return false;
  }

  @shouldDelegate
  isAbsent() {
    return false;
  }

  @shouldDelegate
  isLoading() {
    return false;
  }

  @shouldDelegate
  isEmpty() {
    return false;
  }

  @shouldDelegate
  isPresent() {
    return false;
  }

  @shouldDelegate
  isDestroyed() {
    return false;
  }

  // Lifecycle actions /////////////////////////////////////////////////////////////////////////////////////////////////
  // These generally default to rejecting a Promise with an error.

  @shouldDelegate
  init() {
    return unsupportedOperationPromise(this, 'init');
  }

  @shouldDelegate
  clone(remoteUrl) {
    return unsupportedOperationPromise(this, 'clone');
  }

  @shouldDelegate
  destroy() {
    return unsupportedOperation(this, 'destroy');
  }

  @shouldDelegate
  refresh() {
    // No-op
  }

  @shouldDelegate
  observeFilesystemChange() {
    this.repository.refresh();
  }

  // Git operations ////////////////////////////////////////////////////////////////////////////////////////////////////
  // These default to rejecting a Promise with an error stating that the operation is not supported in the current
  // state.

  // Staging and unstaging

  @shouldDelegate
  stageFiles(paths) {
    return unsupportedOperationPromise(this, 'stageFiles');
  }

  @shouldDelegate
  unstageFiles(paths) {
    return unsupportedOperationPromise(this, 'unstageFiles');
  }

  @shouldDelegate
  stageFilesFromParentCommit(paths) {
    return unsupportedOperationPromise(this, 'stageFilesFromParentCommit');
  }

  @shouldDelegate
  applyPatchToIndex(patch) {
    return unsupportedOperationPromise(this, 'applyPatchToIndex');
  }

  @shouldDelegate
  applyPatchToWorkdir(patch) {
    return unsupportedOperationPromise(this, 'applyPatchToWorkdir');
  }

  // Committing

  @shouldDelegate
  commit(message, options) {
    return unsupportedOperationPromise(this, 'commit');
  }

  // Merging

  @shouldDelegate
  merge(branchName) {
    return unsupportedOperationPromise(this, 'merge');
  }

  @shouldDelegate
  abortMerge() {
    return unsupportedOperationPromise(this, 'abortMerge');
  }

  @shouldDelegate
  checkoutSide(side, paths) {
    return unsupportedOperationPromise(this, 'checkoutSide');
  }

  @shouldDelegate
  mergeFile(oursPath, commonBasePath, theirsPath, resultPath) {
    return unsupportedOperationPromise(this, 'mergeFile');
  }

  @shouldDelegate
  writeMergeConflictToIndex(filePath, commonBaseSha, oursSha, theirsSha) {
    return unsupportedOperationPromise(this, 'writeMergeConflictToIndex');
  }

  // Checkout

  @shouldDelegate
  checkout(revision, options = {}) {
    return unsupportedOperationPromise(this, 'checkout');
  }

  @shouldDelegate
  checkoutPathsAtRevision(paths, revision = 'HEAD') {
    return unsupportedOperationPromise(this, 'checkoutPathsAtRevision');
  }

  // Remote interactions

  @shouldDelegate
  fetch(branchName) {
    return unsupportedOperationPromise(this, 'fetch');
  }

  @shouldDelegate
  pull(branchName) {
    return unsupportedOperationPromise(this, 'pull');
  }

  @shouldDelegate
  push(branchName) {
    return unsupportedOperationPromise(this, 'push');
  }

  // Configuration

  @shouldDelegate
  setConfig(option, value, {replaceAll} = {}) {
    return unsupportedOperationPromise(this, 'setConfig');
  }

  // Direct blob interactions

  @shouldDelegate
  createBlob({filePath, stdin} = {}) {
    return unsupportedOperationPromise(this, 'createBlob');
  }

  @shouldDelegate
  expandBlobToFile(absFilePath, sha) {
    return unsupportedOperationPromise(this, 'expandBlobToFile');
  }

  // Discard history

  @shouldDelegate
  createDiscardHistoryBlob() {
    return unsupportedOperationPromise(this, 'createDiscardHistoryBlob');
  }

  @shouldDelegate
  updateDiscardHistory() {
    return unsupportedOperationPromise(this, 'updateDiscardHistory');
  }

  @shouldDelegate
  storeBeforeAndAfterBlobs(filePaths, isSafe, destructiveAction, partialDiscardFilePath = null) {
    return unsupportedOperationPromise(this, 'storeBeforeAndAfterBlobs');
  }

  @shouldDelegate
  restoreLastDiscardInTempFiles(isSafe, partialDiscardFilePath = null) {
    return unsupportedOperationPromise(this, 'restoreLastDiscardInTempFiles');
  }

  @shouldDelegate
  popDiscardHistory(partialDiscardFilePath = null) {
    return unsupportedOperationPromise(this, 'popDiscardHistory');
  }

  @shouldDelegate
  clearDiscardHistory(partialDiscardFilePath = null) {
    return unsupportedOperationPromise(this, 'clearDiscardHistory');
  }

  @shouldDelegate
  discardWorkDirChangesForPaths(paths) {
    return unsupportedOperationPromise(this, 'discardWorkDirChangesForPaths');
  }

  // Accessors /////////////////////////////////////////////////////////////////////////////////////////////////////////
  // When possible, these default to "empty" results when invoked in states that don't have information available, or
  // fail in a way that's consistent with the requested information not being found.

  // Index queries

  @shouldDelegate
  getStatusesForChangedFiles() {
    return Promise.resolve({
      stagedFiles: [],
      unstagedFiles: [],
      mergeConflictFiles: [],
    });
  }

  @shouldDelegate
  getStagedChangesSinceParentCommit() {
    return Promise.resolve([]);
  }

  @shouldDelegate
  isPartiallyStaged(fileName) {
    return Promise.resolve(false);
  }

  @shouldDelegate
  getFilePatchForPath(filePath, options = {}) {
    return Promise.resolve(null);
  }

  @shouldDelegate
  readFileFromIndex(filePath) {
    return Promise.reject(new Error(`fatal: Path ${filePath} does not exist (neither on disk nor in the index).`));
  }

  // Commit access

  @shouldDelegate
  getLastCommit() {
    return Promise.resolve(nullCommit);
  }

  // Branches

  @shouldDelegate
  getBranches() {
    return Promise.resolve([]);
  }

  @shouldDelegate
  getCurrentBranch() {
    return Promise.resolve(nullBranch);
  }

  // Merging and rebasing status

  @shouldDelegate
  isMerging() {
    return Promise.resolve(false);
  }

  @shouldDelegate
  isRebasing() {
    return Promise.resolve(false);
  }

  // Remotes

  @shouldDelegate
  getRemotes() {
    return Promise.resolve([]);
  }

  @shouldDelegate
  getAheadCount(branchName) {
    return Promise.resolve(null);
  }

  @shouldDelegate
  getBehindCount(branchName) {
    return Promise.resolve(null);
  }

  @shouldDelegate
  getConfig(option, {local} = {}) {
    return Promise.resolve(null);
  }

  // Direct blob access

  @shouldDelegate
  getBlobContents(sha) {
    return Promise.reject(new Error(`fatal: Not a valid object name ${sha}`));
  }

  // Discard history

  @shouldDelegate
  hasDiscardHistory(partialDiscardFilePath = null) {
    return false;
  }

  @shouldDelegate
  getDiscardHistory(partialDiscardFilePath = null) {
    return [];
  }

  @shouldDelegate
  getLastHistorySnapshots(partialDiscardFilePath = null) {
    return null;
  }

  // Internal //////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Non-delegated methods that provide subclasses with convenient access to Repository properties.

  git() {
    return this.repository.git;
  }

  workdir() {
    return this.repository.getWorkingDirectoryPath();
  }

  // Return a Promise that will resolve once the state transitions from Loading.
  getLoadPromise() {
    return this.repository.getLoadPromise();
  }

  getRemoteForBranch(branchName) {
    return this.repository.getRemoteForBranch(branchName);
  }

  saveDiscardHistory() {
    return this.repository.saveDiscardHistory();
  }

  // Initiate a transition to another state.
  transitionTo(stateName, ...payload) {
    const StateConstructor = stateConstructors.get(stateName);
    if (StateConstructor === undefined) {
      throw new Error(`Attempt to transition to unrecognized state ${stateName}`);
    }
    return this.repository.transition(this, StateConstructor, ...payload);
  }

  // Event broadcast

  didDestroy() {
    return this.repository.emitter.emit('did-destroy');
  }

  didUpdate() {
    return this.repository.emitter.emit('did-update');
  }

  // Parse a DiscardHistory payload from the SHA recorded in config.
  async loadHistoryPayload() {
    const historySha = await this.git().getConfig('atomGithub.historySha');
    if (!historySha) {
      return {};
    }

    let blob;
    try {
      blob = await this.git().getBlobContents(historySha);
    } catch (e) {
      if (/Not a valid object name/.test(e.stdErr)) {
        return {};
      }

      throw e;
    }

    try {
      return JSON.parse(blob);
    } catch (e) {
      return {};
    }
  }

  // Debugging assistance.

  toString() {
    return this.constructor.name;
  }
}

function unsupportedOperation(self, opName) {
  throw new Error(`${opName} is not available in ${self} state`);
}

function unsupportedOperationPromise(self, opName) {
  return Promise.reject(new Error(`${opName} is not available in ${self} state`));
}
