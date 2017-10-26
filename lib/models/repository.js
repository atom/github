import path from 'path';

import {Emitter} from 'event-kit';

import {getActionPipelineManager} from '../action-pipeline';
import CompositeGitStrategy from '../composite-git-strategy';
import {readFile} from '../helpers';
import Remote, {nullRemote} from './remote';
import {Loading, Absent, LoadingGuess, AbsentGuess} from './repository-states';

const MERGE_MARKER_REGEX = /^(>|<){7} \S+$/m;

// Internal option keys used to designate the desired initial state of a Repository.
const initialStateSym = Symbol('initialState');

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
  constructor(workingDirectoryPath, gitStrategy = null, options = {}) {
    this.workingDirectoryPath = workingDirectoryPath;
    this.git = gitStrategy || CompositeGitStrategy.create(workingDirectoryPath);

    this.emitter = new Emitter();

    this.loadPromise = new Promise(resolve => {
      const sub = this.onDidChangeState(() => {
        if (!this.isLoading()) {
          resolve();
          sub.dispose();
        } else if (this.isDestroyed()) {
          sub.dispose();
        }
      });
    });

    this.pipelineManager = options.pipelineManager;
    this.transitionTo(options[initialStateSym] || Loading);
  }

  static absent(options) {
    return new Repository(null, null, {[initialStateSym]: Absent, ...options});
  }

  static loadingGuess(options) {
    return new Repository(null, null, {[initialStateSym]: LoadingGuess, ...options});
  }

  static absentGuess(options) {
    return new Repository(null, null, {[initialStateSym]: AbsentGuess, ...options});
  }

  // State management //////////////////////////////////////////////////////////////////////////////////////////////////

  transition(currentState, StateConstructor, ...payload) {
    if (currentState !== this.state) {
      // Attempted transition from a non-active state, most likely from an asynchronous start() method.
      return Promise.resolve();
    }

    const nextState = new StateConstructor(this, ...payload);
    this.state = nextState;

    this.emitter.emit('did-change-state', {from: currentState, to: this.state});
    if (!this.isDestroyed()) {
      this.emitter.emit('did-update');
    }

    return this.state.start();
  }

  transitionTo(StateConstructor, ...payload) {
    return this.transition(this.state, StateConstructor, ...payload);
  }

  getLoadPromise() {
    return this.isAbsent() ? Promise.reject(new Error('An absent repository will never load')) : this.loadPromise;
  }

  /*
   * Use `callback` to request user input from all git strategies.
   */
  setPromptCallback(callback) {
    this.git.getImplementers().forEach(strategy => strategy.setPromptCallback(callback));
  }

  // Pipeline
  getPipeline(actionName) {
    const actionKey = this.pipelineManager.actionKeys[actionName];
    return this.pipelineManager.getPipeline(actionKey);
  }

  executePipelineAction(actionName, fn, ...args) {
    const pipeline = this.getPipeline(actionName);
    return pipeline.run(fn, this, ...args);
  }

  // Event subscription ////////////////////////////////////////////////////////////////////////////////////////////////

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  onDidChangeState(callback) {
    return this.emitter.on('did-change-state', callback);
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }

  // State-independent actions /////////////////////////////////////////////////////////////////////////////////////////
  // Actions that use direct filesystem access or otherwise don't need `this.git` to be available.

  async pathHasMergeMarkers(relativePath) {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), relativePath), 'utf8');
      return MERGE_MARKER_REGEX.test(contents);
    } catch (e) {
      // EISDIR implies this is a submodule
      if (e.code === 'ENOENT' || e.code === 'EISDIR') { return false; } else { throw e; }
    }
  }

  async getMergeMessage() {
    try {
      const contents = await readFile(path.join(this.getGitDirectoryPath(), 'MERGE_MSG'), 'utf8');
      return contents;
    } catch (e) {
      return null;
    }
  }

  // State-independent accessors ///////////////////////////////////////////////////////////////////////////////////////

  getWorkingDirectoryPath() {
    return this.workingDirectoryPath;
  }

  setGitDirectoryPath(gitDirectoryPath) {
    this._gitDirectoryPath = gitDirectoryPath;
  }

  getGitDirectoryPath() {
    if (this._gitDirectoryPath) {
      return this._gitDirectoryPath;
    } else if (this.getWorkingDirectoryPath()) {
      return path.join(this.getWorkingDirectoryPath(), '.git');
    } else {
      // Absent/Loading/etc.
      return null;
    }
  }

  isInState(stateName) {
    return this.state.constructor.name === stateName;
  }

  toString() {
    return `Repository(state=${this.state.constructor.name}, workdir="${this.getWorkingDirectoryPath()}")`;
  }

  // Compound Getters //////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessor methods for data derived from other, state-provided getters.

  async getUnstagedChanges() {
    const {unstagedFiles} = await this.getStatusBundle();
    return Object.keys(unstagedFiles).map(filePath => { return {filePath, status: unstagedFiles[filePath]}; });
  }

  async getStagedChanges() {
    const {stagedFiles} = await this.getStatusBundle();
    return Object.keys(stagedFiles).map(filePath => { return {filePath, status: stagedFiles[filePath]}; });
  }

  async getMergeConflicts() {
    const {mergeConflictFiles} = await this.getStatusBundle();
    return Object.keys(mergeConflictFiles).map(filePath => {
      return {filePath, status: mergeConflictFiles[filePath]};
    });
  }

  async isPartiallyStaged(fileName) {
    const {unstagedFiles, stagedFiles} = await this.getStatusBundle();
    const u = unstagedFiles[fileName];
    const s = stagedFiles[fileName];
    return (u === 'modified' && s === 'modified') ||
      (u === 'modified' && s === 'added') ||
      (u === 'added' && s === 'deleted') ||
      (u === 'deleted' && s === 'modified');
  }

  async getRemoteForBranch(branchName) {
    const name = await this.getConfig(`branch.${branchName}.remote`);
    if (name === null) {
      return nullRemote;
    } else {
      return new Remote(name);
    }
  }

  async saveDiscardHistory() {
    if (this.isDestroyed()) {
      return;
    }

    const historySha = await this.createDiscardHistoryBlob();
    if (this.isDestroyed()) {
      return;
    }
    await this.setConfig('atomGithub.historySha', historySha);
  }
}

// The methods named here will be delegated to the current State.
//
// This list should match the methods decorated with @shouldDelegate in `lib/models/repository-states/state.js`. A test
// case in `test/models/repository.test.js` ensures that these sets match.
//
// Duplicated here rather than just using `expectedDelegates` directly so that this file is grep-friendly for answering
// the question of "what all can a Repository do exactly".
const delegates = [
  'isLoadingGuess',
  'isAbsentGuess',
  'isAbsent',
  'isLoading',
  'isEmpty',
  'isPresent',
  'isTooLarge',
  'isDestroyed',

  'isUndetermined',
  'showGitTabInit',
  'showGitTabInitInProgress',
  'showGitTabLoading',
  'showStatusBarTiles',
  'hasDirectory',

  'init',
  'clone',
  'destroy',
  'refresh',
  'observeFilesystemChange',

  'stageFiles',
  'unstageFiles',
  'stageFilesFromParentCommit',
  'applyPatchToIndex',
  'applyPatchToWorkdir',

  'commit',

  'merge',
  'abortMerge',
  'checkoutSide',
  'mergeFile',
  'writeMergeConflictToIndex',

  'checkout',
  'checkoutPathsAtRevision',

  'fetch',
  'pull',
  'push',

  'setConfig',

  'createBlob',
  'expandBlobToFile',

  'createDiscardHistoryBlob',
  'updateDiscardHistory',
  'storeBeforeAndAfterBlobs',
  'restoreLastDiscardInTempFiles',
  'popDiscardHistory',
  'clearDiscardHistory',
  'discardWorkDirChangesForPaths',

  'getStatusBundle',
  'getStatusesForChangedFiles',
  'getStagedChangesSinceParentCommit',
  'getFilePatchForPath',
  'readFileFromIndex',

  'getLastCommit',

  'getBranches',
  'getCurrentBranch',
  'getHeadDescription',

  'isMerging',
  'isRebasing',

  'getRemotes',

  'getAheadCount',
  'getBehindCount',

  'getConfig',
  'unsetConfig',

  'getBlobContents',

  'hasDiscardHistory',
  'getDiscardHistory',
  'getLastHistorySnapshots',

  'setOperationProgressState',
  'getOperationStates',
  'setAmending',
  'isAmending',
  'setAmendingCommitMessage',
  'getAmendingCommitMessage',
  'setRegularCommitMessage',
  'getRegularCommitMessage',
];

for (let i = 0; i < delegates.length; i++) {
  const delegate = delegates[i];

  Repository.prototype[delegate] = function(...args) {
    return this.state[delegate](...args);
  };
}
