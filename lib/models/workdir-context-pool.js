import compareSets from 'compare-sets';

import {Emitter, CompositeDisposable} from 'event-kit';
import WorkdirContext from './workdir-context';

/**
 * Manage a WorkdirContext for each open directory.
 */
export default class WorkdirContextPool {

  /**
   * Options will be passed to each `WorkdirContext` as it is created.
   */
  constructor(options = {}) {
    this.options = options;

    this.contexts = new Map();
    this.emitter = new Emitter();
  }

  size() {
    return this.contexts.size;
  }

  /**
   * Access the context mapped to a known directory.
   */
  getContext(directory) {
    const {pipelineManager} = this.options;
    return this.contexts.get(directory) || WorkdirContext.absent({pipelineManager});
  }

  add(directory, options = {}) {
    if (this.contexts.has(directory)) {
      return this.getContext(directory);
    }

    const context = new WorkdirContext(directory, {...this.options, ...options});
    this.contexts.set(directory, context);

    const disposable = new CompositeDisposable();

    const forwardEvent = (subMethod, emitEventName) => {
      const emit = () => this.emitter.emit(emitEventName, context);
      disposable.add(context[subMethod](emit));
    };

    forwardEvent('onDidStartObserver', 'did-start-observer');
    forwardEvent('onDidChangeWorkdirOrHead', 'did-change-workdir-or-head');
    forwardEvent('onDidChangeRepositoryState', 'did-change-repository-state');
    forwardEvent('onDidUpdateRepository', 'did-update-repository');
    forwardEvent('onDidDestroyRepository', 'did-destroy-repository');

    disposable.add(this.onDidRemoveContext(removed => {
      if (removed === context) {
        disposable.dispose();
      }
    }));

    return context;
  }

  replace(directory, options = {}) {
    this.remove(directory);
    this.add(directory, options);
  }

  remove(directory) {
    const existing = this.contexts.get(directory);
    this.contexts.delete(directory);

    if (existing) {
      this.emitter.emit('did-remove-context', existing);
      existing.destroy();
    }
  }

  set(directories, options = {}) {
    const previous = new Set(this.contexts.keys());
    const {added, removed} = compareSets(previous, directories);

    for (const directory of added) {
      this.add(directory, options);
    }
    for (const directory of removed) {
      this.remove(directory);
    }
  }

  withResidentContexts(callback) {
    for (const [workdir, context] of this.contexts) {
      callback(workdir, context);
    }
  }

  onDidStartObserver(callback) {
    return this.emitter.on('did-start-observer', callback);
  }

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  onDidRemoveContext(callback) {
    return this.emitter.on('did-remove-context', callback);
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

  clear() {
    this.withResidentContexts(workdir => this.remove(workdir));
    WorkdirContext.destroyAbsent();
  }
}
