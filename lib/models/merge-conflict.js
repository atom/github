/** @babel */

export default class MergeConflict {
  constructor (path, baseIndexEntry, ourIndexEntry, theirIndexEntry, fileStatus) {
    this.path = path
    this.ourIndexEntry = ourIndexEntry
    this.theirIndexEntry = theirIndexEntry
    this.baseIndexEntry = baseIndexEntry
    this.fileStatus = fileStatus // A (added), D (deleted), M (modified), E (equivalent)
    this.setOursStatus()
    this.setTheirsStatus()
    Object.defineProperty(this, 'destroyed', {value: false, enumerable: false, writable: true})
  }

  getPath () {
    return this.path
  }

  setOursStatus () {
    if (!this.ourIndexEntry) {
      this.oursStatus = '-'
    } else if (!this.baseIndexEntry) {
      this.oursStatus = '+'
    } else {
      this.oursStatus = '*'
    }
  }

  setTheirsStatus () {
    if (!this.theirIndexEntry) {
      this.theirsStatus = '-'
    } else if (!this.baseIndexEntry) {
      this.theirsStatus = '+'
    } else {
      this.theirsStatus = '*'
    }
  }

  getOursStatus () {
    return this.oursStatus
  }

  getTheirsStatus () {
    return this.theirsStatus
  }

  getFileStatus () {
    return this.fileStatus
  }

  updateFileStatus (fileStatus) {
    this.fileStatus = fileStatus
  }

  destroy () {
    this.destroyed = true
  }

  isDestroyed () {
    return this.destroyed
  }
}
