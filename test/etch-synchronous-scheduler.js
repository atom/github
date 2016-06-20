/** @babel */

export default class SynchronousScheduler {
  updateDocument (fn) {
    fn()
  }

  readDocument (fn) {
    fn()
  }

  getNextUpdatePromise () {
    return Promise.resolve()
  }
}
