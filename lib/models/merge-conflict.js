/** @babel */

export default class MergeConflict {
  constructor (path, baseIndexEntry, ourIndexEntry, theirIndexEntry, fileStatus) {
    this.path = path
    this.ourIndexEntry = ourIndexEntry
    this.theirIndexEntry = theirIndexEntry
    this.baseIndexEntry = baseIndexEntry
    this.fileStatus = fileStatus // added, removed, modified, equivalent
    this.setOursStatus()
    this.setTheirsStatus()
  }

  getPath () {
    return this.path
  }

  setOursStatus () {
    if (!this.getOurIndexEntry) {
      this.oursStatus = 'removed'
    } else if (!this.baseIndexEntry) {
      this.oursStatus = 'added'
    } else {
      this.oursStatus = 'modified'
    }
  }

  setTheirsStatus () {
    if (!this.getTheirIndexEntry) {
      this.theirsStatus = 'removed'
    } else if (!this.baseIndexEntry) {
      this.theirsStatus = 'added'
    } else {
      this.theirsStatus = 'modified'
    }
  }

  getOursStatus () {
    return this.oursStatus
  }

  getTheirsStatus () {
    return this.theirsStatus
  }

  getFileStatus () {
    return 'modified' // this.fileStatus
  }

  updateFileStatus (fileStatus) {
    this.fileStatus = fileStatus
  }
}
