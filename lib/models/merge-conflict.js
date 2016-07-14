/** @babel */

export default class MergeConflict {
  constructor (path, baseIndexEntry, ourIndexEntry, theirIndexEntry) {
    this.path = path
    this.ourIndexEntry = ourIndexEntry
    this.theirIndexEntry = theirIndexEntry
    this.baseIndexEntry = baseIndexEntry
  }

  getPath () {
    return this.path
  }

  getOurIndexEntry () {
    return this.ourIndexEntry
  }

  getTheirIndexEntry () {
    return this.theirIndexEntry
  }

  getBaseIndexEntry () {
    return this.baseIndexEntry
  }

  isDeletion () {
    return !this.theirIndexEntry
  }
}
