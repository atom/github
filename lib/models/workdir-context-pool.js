import compareSets from 'compare-sets';

import {Emitter, CompositeDisposable} from 'event-kit';
import WorkdirContext, {NullWorkdirContext} from './workdir-context';

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
    return this.contexts.get(directory) || new NullWorkdirContext(directory);
  }

  add(directory, options = {}) {
    if (this.contexts.has(directory)) {
      return;
    }

    let savedResolutionProgress = {};
    if (options.resolutionProgressByPath) {
      savedResolutionProgress = options.resolutionProgressByPath[directory] || {};
    }

    const context = new WorkdirContext(directory, {savedResolutionProgress, ...this.options, ...options});
    this.contexts.set(directory, context);

    const disposable = new CompositeDisposable();
    const forwardEvent = (subMethod, emitEventName) => {
      const emit = () => this.emitter.emit(emitEventName, context);
      disposable.add(context[subMethod](emit));
    };
    forwardEvent('onDidChangeWorkdirOrHead', 'did-change-workdir-or-head');
    forwardEvent('onDidUpdateRepository', 'did-update-repository');
    forwardEvent('onDidDestroyRepository', 'did-destroy-repository');
    disposable.add(this.onDidRemoveContext(removed => {
      if (removed === context) {
        disposable.dispose();
      }
    }));

    context.create();
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

  onDidRemoveContext(callback) {
    return this.emitter.on('did-remove-context', callback);
  }

  onDidUpdateRepository(callback) {
    return this.emitter.on('did-update-repository', callback);
  }

  onDidDestroyRepository(callback) {
    return this.emitter.on('did-destroy-repository', callback);
  }

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  clear() {
    this.withResidentContexts(workdir => this.remove(workdir));
  }
}
