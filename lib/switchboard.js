import {Emitter} from 'atom'; // FIXME import from event-kit instead

/*
 * Register callbacks and construct Promises to wait for the next occurrence of specific events that occur throughout
 * the data refresh and rendering cycle.
 */
export default class Switchboard {
  constructor() {
    this.promises = new Map();
    this.emitter = new Emitter();
  }

  /*
   * Invoke a callback each time that a desired event is observed. Return a Disposable that can be used to
   * unsubscribe from events.
   *
   * In general, you should use the more specific `onDidXyz` methods.
   */
  onDid(eventName, callback) {
    return this.emitter.on(`did-${eventName}`, callback);
  }

  /*
   * Indicate that a named event has been observed, firing any callbacks and resolving any Promises that were created
   * for this event. Optionally provide a payload with more information.
   *
   * In general, you should prefer the more specific `didXyz()` methods.
   */
  did(eventName, payload) {
    this.emitter.emit(`did-${eventName}`, payload);
  }

  /*
   * Retrieve a Promise that will be resolved the next time a desired event is observed.
   *
   * In general, you should prefer the more specific `getXyzPromise()` methods.
   */
  getPromise(eventName) {
    const existing = this.promises.get(eventName);
    if (existing !== undefined) {
      return existing;
    }

    const created = new Promise((resolve, reject) => {
      const subscription = this.onDid(eventName, payload => {
        subscription.dispose();
        this.promises.delete(eventName);
        resolve(payload);
      });
    });
    this.promises.set(eventName, created);
    return created;
  }

  /*
   * Invoke callback each time a hunk or line staging or unstaging operation has completed in git.
   */
  onDidFinishStageOperation(callback) {
    return this.onDid('finish-stage-operation', callback);
  }

  /*
   * Notified when a hunk or line stage or unstage operation has completed.
   */
  getFinishStageOperationPromise() {
    return this.getPromise('finish-stage-operation');
  }

  /*
   * A hunk or line stage or unstage operation has completed.
   */
  didFinishStageOperation(payload) {
    this.did('finish-stage-operation', payload);
  }

  /*
   * Invoke callback each time a FilePatchView's hunks change.
   */
  onDidChangePatch(callback) {
    return this.onDid('change-patch', callback);
  }

  /*
   * Notified when an open FilePatchView's hunks have changed.
   */
  getChangePatchPromise() {
    return this.getPromise('change-patch');
  }

  /*
   * An open FilePatchView's hunks have changed.
   */
  didChangePatch(payload) {
    this.did('change-patch', payload);
  }
}
