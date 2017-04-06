import compareSets from 'compare-sets';

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
  }

  size() {
    return this.contexts.size;
  }

  /**
   * Access the context mapped to a known directory.
   */
  getContext(directory) {
    return this.contexts.get(directory);
  }

  add(directory, options = {}) {
    if (this.contexts.has(directory)) {
      return;
    }

    const context = new WorkdirContext(directory, {...this.options, ...options});
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
