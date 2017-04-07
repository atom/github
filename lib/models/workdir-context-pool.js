import compareSets from 'compare-sets';

import WorkdirContext, {nullWorkdirContext} from './workdir-context';

/**
 * Manage a WorkdirContext for each open directory.
 */
export default class WorkdirContextPool {

  /**
   * Recognized options:
   *
   * - `options.resolutionProgressByPath`: saved resolution progress state associated with a previously opened
   *   working directory.
   *
   * All other options will be passed to each `WorkdirContext` as it is created.
   */
  constructor(options = {}) {
    this.resolutionProgressByPath = options.resolutionProgressByPath || {};
    delete options.resolutionProgressByPath;

    this.options = options;

    this.contexts = new Map();
  }

  size() {
    return this.contexts.size;
  }

  /**
   * Access the context mapped to a known directory.
   */
  getContext(directory) {
    return this.contexts.get(directory) || nullWorkdirContext;
  }

  add(directory, options = {}) {
    if (this.contexts.has(directory)) {
      return;
    }

    const savedResolutionProgress = this.resolutionProgressByPath[directory] || {};

    const context = new WorkdirContext(directory, {savedResolutionProgress, ...this.options, ...options});
    this.contexts.set(directory, context);

    context.create();
  }

  remove(directory) {
    const existing = this.contexts.get(directory);
    this.contexts.delete(directory);
    existing && existing.destroy();
  }

  set(directories) {
    const previous = new Set(this.contexts.keys());
    const {added, removed} = compareSets(previous, directories);

    for (const directory of added) {
      this.add(directory);
    }
    for (const directory of removed) {
      this.remove(directory);
    }
  }
}
