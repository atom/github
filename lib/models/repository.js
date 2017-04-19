import path from 'path';

import {Emitter} from 'event-kit';

import CompositeGitStrategy from '../composite-git-strategy';
import {readFile} from '../helpers';
import Remote, {nullRemote} from './remote';
import {LoadingState, AbsentState, UndeterminedState} from './repository-states';

const MERGE_MARKER_REGEX = /^(>|<){7} \S+$/m;

const ABSENT = {};
const UNDETERMINED = {};
const LOADING = {};

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

function getStateConstructor(token) {
  if (token === ABSENT) {
    return AbsentState;
  } else if (token === UNDETERMINED) {
    return UndeterminedState;
  } else {
    return LoadingState;
  }
}

export default class Repository {
  constructor(workingDirectoryPath, gitStrategy = null, initialState = LOADING) {
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

    this.transitionTo(getStateConstructor(initialState));
  }

  static absent() {
    return new Repository(null, null, ABSENT);
  }

  static undetermined() {
    return new Repository(null, null, UNDETERMINED);
  }

  // State management //////////////////////////////////////////////////////////////////////////////////////////////////

  transition(currentState, StateConstructor, ...payload) {
    const nextState = new StateConstructor(this, ...payload);
    this.state = nextState;

    this.emitter.emit('did-change-state', {from: currentState, to: this.state});
    this.emitter.emit('did-update');

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
      if (e.code === 'ENOENT') { return false; } else { throw e; }
    }
  }

  async getMergeMessage() {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), '.git', 'MERGE_MSG'), 'utf8');
      return contents;
    } catch (e) {
      return null;
    }
  }

  // State-independent accessors ///////////////////////////////////////////////////////////////////////////////////////

  getWorkingDirectoryPath() {
    return this.workingDirectoryPath;
  }

  getGitDirectoryPath() {
    return path.join(this.getWorkingDirectoryPath(), '.git');
  }

  isInState(stateName) {
    return this.state.constructor.name === stateName;
  }

  // Compound Getters //////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessor methods for data derived from other, state-provided getters.

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

  async getRemoteForBranch(branchName) {
    const name = await this.getConfig(`branch.${branchName}.remote`);
    if (name === null) {
      return nullRemote;
    } else {
      return new Remote(name);
    }
  }

  async saveDiscardHistory() {
    const historySha = await this.createDiscardHistoryBlob();
    await this.setConfig('atomGithub.historySha', historySha);
  }
}

// The methods named here will be delegated to the current State.
// This list should match the methods decorated with @shouldDelegate in `lib/models/repository-states/state.js`. A test
// case in `test/models/repository.test.js` ensures that these sets match.
const delegates = [
  'isUndetermined',
  'isAbsent',
  'isLoading',
  'isEmpty',
  'isPresent',
  'isDestroyed',

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

  'getStatusesForChangedFiles',
  'getStagedChangesSinceParentCommit',
  'isPartiallyStaged',
  'getFilePatchForPath',
  'readFileFromIndex',

  'getLastCommit',

  'getBranches',
  'getCurrentBranch',

  'isMerging',
  'isRebasing',

  'getRemotes',

  'getAheadCount',
  'getBehindCount',

  'getConfig',

  'getBlobContents',

  'hasDiscardHistory',
  'getDiscardHistory',
  'getLastHistorySnapshots',
];

for (let i = 0; i < delegates.length; i++) {
  const delegate = delegates[i];

  Repository.prototype[delegate] = function(...args) {
    return this.state[delegate](...args);
  };
}
