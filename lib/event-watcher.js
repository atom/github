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
      existing.resolver(payload);
    }
  }

  /*
   * Indicate that a named event has had some kind of terrible problem.
   */
  rejectPromise(eventName, error) {
    const existing = this.promises.get(eventName);
    if (existing !== undefined) {
      existing.rejecter(error);
    }
  }

  /*
   * Notified when a hunk stage or unstage operation has completed.
   */
  getHunkStageOperationPromise() {
    return this.getPromise('hunk-stage-operation');
  }

  /*
   * Notified when an open FilePatchView's hunks have changed.
   */
  getHunkChangedPromise() {
    return this.getPromise('hunk-changed');
  }

  /*
   * A hunk stage or unstage operation has completed.
   */
  resolveHunkStageOperationPromise(payload) {
    this.resolvePromise('hunk-stage-operation', payload);
  }

  /*
   * An open FilePatchView's hunks have changed.
   */
  resolveHunkChangedPromise(payload) {
    this.resolvePromise('hunk-changed', payload);
  }
}
