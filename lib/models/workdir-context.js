import {Emitter, CompositeDisposable} from 'event-kit';

import Repository from './repository';
import ResolutionProgress from './conflicts/resolution-progress';
import FileSystemChangeObserver from './file-system-change-observer';
import WorkspaceChangeObserver from './workspace-change-observer';

// Provide both synchronous and asynchronous access to a value.
class Deferred {
  constructor(value = null) {
    if (value !== null) {
      this.value = value;
      this.promise = Promise.resolve(value);
      this.resolve = () => {
        throw new Error('Attempt to resolve Deferred with concrete value');
      };
      this.reject = () => {
        throw new Error('Attempt to reject Deferred with concrete value');
      };
    } else {
      this.value = null;
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
  }

  hasValue() {
    return this.value !== null;
  }

  setValue(value) {
    this.value = value;
    this.resolve(value);
  }

  getValue() {
    return this.value;
  }

  getPromise() {
    return this.promise;
  }
}

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
   * - `options.repository`: Pre-initialized Repository instance if one is available.
   * - `options.savedResolutionProgress`: Serialized state used to initialize the ResolutionProgress.
   * - `options.window`: Browser window global, used on Linux by the WorkspaceChangeObserver.
   * - `options.workspace`: Atom's workspace singleton, used on Linux by the WorkspaceChangeObserver.
   * - `options.promptCallback`: Callback used to collect information interactively through Atom.
   */
  constructor(directory, options = {}) {
    this.directory = directory;
    this.options = options;

    this.repositoryHolder = new Deferred(this.options.repository || null);
    this.changeObserverHolder = new Deferred();
    this.resolutionProgressHolder = new Deferred();

    this.destroyed = false;
    this.emitter = new Emitter();
    this.subs = new CompositeDisposable();
  }

  /*
   * Initialize all model objects associated with this git working directory. Return a Promise that will resolve when
   * all models are available and ready, including the filesystem watcher. Outside of test cases, it's generally
   * better to not await this Promise and instead await the `getXyzPromise()` of the models that you need.
   */
  async create() {
    if (this.destroyed) {
      return;
    }

    let repo;
    if (!this.repositoryHolder.hasValue()) {
      repo = await Repository.open(this.directory);
      this.repositoryHolder.setValue(repo);
    } else {
      repo = this.getRepository();
    }

    if (!repo) {
      this.changeObserverHolder.setValue(null);
      this.resolutionProgressHolder.setValue(null);
      return;
    }

    if (this.options.promptCallback) {
      repo.setPromptCallback(this.options.promptCallback);
    }

    // Event forwarding from repository
    this.subs.add(repo.onDidDestroy(() => this.emitter.emit('did-destroy-repository')));
    this.subs.add(repo.onDidUpdate(() => this.emitter.emit('did-update-repository')));

    const changeObserver = process.platform === 'linux'
      ? new WorkspaceChangeObserver(this.options.window, this.options.workspace, repo)
      : new FileSystemChangeObserver(repo);

    // Event forwarding from change observer
    this.subs.add(changeObserver.onDidChange(() => repo.refresh()));
    this.subs.add(changeObserver.onDidChangeWorkdirOrHead(() => this.emitter.emit('did-change-workdir-or-head')));

    this.changeObserverHolder.setValue(changeObserver);

    const populateResolutionProgress = async () => {
      const commit = await repo.getLastCommit();
      const progress = new ResolutionProgress(commit.sha, this.options.savedResolutionProgress || {});
      this.resolutionProgressHolder.setValue(progress);
    };

    await Promise.all([
      populateResolutionProgress(),
      changeObserver.start(),
    ]);
  }

  isPresent() {
    return true;
  }

  isDestroyed() {
    return this.destroyed;
  }

  /*
   * Subscribe to the filesystem observer event.
   */
  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  onDidUpdateRepository(callback) {
    return this.emitter.on('did-update-repository', callback);
  }

  onDidDestroyRepository(callback) {
    return this.emitter.on('did-destroy-repository', callback);
  }

  getWorkingDirectory() {
    return this.directory;
  }

  getRepository() {
    return this.repositoryHolder.getValue();
  }

  getRepositoryPromise() {
    return this.repositoryHolder.getPromise();
  }

  getChangeObserver() {
    return this.changeObserverHolder.getValue();
  }

  getChangeObserverPromise() {
    return this.changeObserverHolder.getPromise();
  }

  getResolutionProgress() {
    return this.resolutionProgressHolder.getValue();
  }

  getResolutionProgressPromise() {
    return this.resolutionProgressHolder.getPromise();
  }

  /*
   * Cleanly destroy any models that need to be cleaned, including stopping the filesystem watcher.
   */
  async destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.subs.dispose();
    this.emitter.dispose();

    const observer = this.getChangeObserver();
    const repository = this.getRepository();

    repository && repository.destroy();

    if (observer) {
      await observer.destroy();
    }
  }
}

class NullWorkdirContext extends WorkdirContext {
  constructor() {
    super(null, {});

    this.repositoryHolder.setValue(null);
    this.changeObserverHolder.setValue(null);
    this.resolutionProgressHolder.setValue(null);
  }

  create() {
    return Promise.resolve();
  }

  isPresent() {
    return false;
  }

  destroy() {
    return Promise.resolve();
  }
}

export const nullWorkdirContext = new NullWorkdirContext();
