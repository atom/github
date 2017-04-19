import {Emitter, CompositeDisposable} from 'event-kit';
import {autobind} from 'core-decorators';

import Repository from './repository';
import ResolutionProgress from './conflicts/resolution-progress';
import FileSystemChangeObserver from './file-system-change-observer';
import WorkspaceChangeObserver from './workspace-change-observer';

const initRepoState = Symbol('initRepoState');

const ABSENT = {};
const UNDETERMINED = {};

/*
 * Bundle of model objects associated with a git working directory.
 *
 * Provides synchronous access to each model in the form of a getter method that returns the model or `null` if it
 * has not yet been initialized, and asynchronous access in the form of a Promise generation method that will resolve
 * once the model is available. Initializes the platform-appropriate change observer and proxies select filesystem
 * change events.
 */
export default class WorkdirContext {

  /*
   * Available options:
   * - `options.savedResolutionProgress`: Serialized state used to initialize the ResolutionProgress.
   * - `options.window`: Browser window global, used on Linux by the WorkspaceChangeObserver.
   * - `options.workspace`: Atom's workspace singleton, used on Linux by the WorkspaceChangeObserver.
   * - `options.promptCallback`: Callback used to collect information interactively through Atom.
   */
  constructor(directory, options = {}) {
    this.directory = directory;
    this.repository = (token => {
      if (token === ABSENT) { return Repository.absent(); }
      if (token === UNDETERMINED) { return Repository.undetermined(); }
      return new Repository(directory);
    })(options[initRepoState]);

    const {window: theWindow, workspace, promptCallback} = options;
    this.savedResolutionProgress = options.savedResolutionProgress || {};

    this.destroyed = false;
    this.emitter = new Emitter();
    this.subs = new CompositeDisposable();

    this.observer = process.platform === 'linux'
      ? new WorkspaceChangeObserver(theWindow, workspace, this.repository)
      : new FileSystemChangeObserver(this.repository);
    this.resolutionProgress = new ResolutionProgress();

    if (promptCallback) {
      this.repository.setPromptCallback(promptCallback);
    }

    // Wire up event forwarding among models
    this.subs.add(this.repository.onDidChangeState(this.repositoryChangedState));
    this.subs.add(this.observer.onDidChange(payload => this.repository.observeFilesystemChange(payload)));
    this.subs.add(this.observer.onDidChangeWorkdirOrHead(() => this.emitter.emit('did-change-workdir-or-head')));

    // If a pre-loaded Repository was provided, broadcast an initial state change event.
    this.repositoryChangedState({from: null, to: this.repository.state});
  }

  static undetermined() {
    return new WorkdirContext(null, {[initRepoState]: UNDETERMINED});
  }

  /**
   * Respond to changes in `Repository` state. Load resolution progress and start the change observer when it becomes
   * present. Stop the change observer when it is destroyed. Re-broadcast the event to context subscribers
   * regardless.
   *
   * The ResolutionProgress will be loaded before the change event is re-broadcast, but change observer modifications
   * will not be complete.
   */
  @autobind
  async repositoryChangedState(payload) {
    if (this.destroyed) {
      return;
    }

    if (this.repository.isPresent()) {
      this.observer.start().then(() => this.emitter.emit('did-start-observer'));

      const head = await this.repository.getLastCommit();
      this.resolutionProgress.load(head.getSha(), this.savedResolutionProgress);
    } else if (this.repository.isDestroyed()) {
      this.emitter.emit('did-destroy-repository');

      this.observer.destroy();
    }

    this.emitter.emit('did-change-repository-state', payload);
  }

  isPresent() {
    return true;
  }

  isDestroyed() {
    return this.destroyed;
  }

  // Event subscriptions

  onDidStartObserver(callback) {
    return this.emitter.on('did-start-observer', callback);
  }

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  onDidChangeRepositoryState(callback) {
    return this.emitter.on('did-change-repository-state', callback);
  }

  onDidUpdateRepository(callback) {
    return this.emitter.on('did-update-repository', callback);
  }

  onDidDestroyRepository(callback) {
    return this.emitter.on('did-destroy-repository', callback);
  }

  /**
   * Return a Promise that will resolve the next time that a Repository transitions to the requested state. Most
   * useful for test cases; most callers should prefer subscribing to `onDidChangeRepositoryState`.
   */
  getRepositoryStatePromise(stateName) {
    return new Promise(resolve => {
      const sub = this.onDidChangeRepositoryState(() => {
        if (this.repository.isInState(stateName)) {
          resolve();
          sub.dispose();
        }
      });
    });
  }

  /**
   * Return a Promise that will resolve the next time that a ChangeObserver successfully starts. Most useful for
   * test cases.
   */
  getObserverStartedPromise() {
    return new Promise(resolve => {
      const sub = this.onDidStartObserver(() => {
        resolve();
        sub.dispose();
      });
    });
  }

  getWorkingDirectory() {
    return this.directory;
  }

  getRepository() {
    return this.repository;
  }

  getChangeObserver() {
    return this.observer;
  }

  getResolutionProgress() {
    return this.resolutionProgress;
  }

  /*
   * Cleanly destroy any models that need to be cleaned, including stopping the filesystem watcher.
   */
  async destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.repository.destroy();
    this.subs.dispose();
    this.emitter.dispose();

    await this.observer.destroy();
  }
}

class AbsentWorkdirContext extends WorkdirContext {
  constructor() {
    super(null, {[initRepoState]: ABSENT});
  }

  isPresent() {
    return false;
  }
}

export const absentWorkdirContext = new AbsentWorkdirContext();
