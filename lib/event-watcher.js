/*
 * Construct Promises to wait for the next occurrence of specific events that occur throughout the data refresh
 * and rendering cycle. Resolve those promises when the corresponding events have been observed.
 */
export default class EventWatcher {
  constructor() {
    this.promises = new Map();
  }

  /*
   * Retrieve a Promise that will be resolved the next time a desired event is observed.
   *
   * In general, you should prefer the more specific `getXyzPromise()` methods instead to avoid a proliferation of
   * "magic strings."
   */
  getPromise(eventName) {
    const existing = this.promises.get(eventName);
    if (existing !== undefined) {
      return existing.promise;
    }

    let resolver, rejecter;
    const created = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });
    this.promises.set(eventName, {
      promise: created,
      resolver,
      rejecter,
    });
    return created;
  }

  /*
   * Indicate that a named event has been observed, resolving any Promises that were created for this event. Optionally
   * provide a payload.
   *
   * In general, you should prefer the more specific `resolveXyzPromise()` methods.
   */
  resolvePromise(eventName, payload) {
    const existing = this.promises.get(eventName);
    if (existing !== undefined) {
      this.promises.delete(eventName);
      existing.resolver(payload);
    }
  }

  /*
   * Indicate that a named event has had some kind of terrible problem.
   */
  rejectPromise(eventName, error) {
    const existing = this.promises.get(eventName);
    if (existing !== undefined) {
      this.promises.delete(eventName);
      existing.rejecter(error);
    }
  }

  /*
   * Notified when a hunk or line stage or unstage operation has completed.
   */
  getStageOperationPromise() {
    return this.getPromise('stage-operation');
  }

  /*
   * Notified when an open FilePatchView's hunks have changed.
   */
  getPatchChangedPromise() {
    return this.getPromise('patch-changed');
  }

  /*
   * A hunk or line stage or unstage operation has completed.
   */
  resolveStageOperationPromise(payload) {
    this.resolvePromise('stage-operation', payload);
  }

  /*
   * An open FilePatchView's hunks have changed.
   */
  resolvePatchChangedPromise(payload) {
    this.resolvePromise('patch-changed', payload);
  }
}
