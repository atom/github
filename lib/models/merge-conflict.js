/** @babel */

export default class MergeConflict {
  constructor (path, oursStatus, theirsStatus, fileStatus) {
    this.path = path
    this.oursStatus = oursStatus
    this.theirsStatus = theirsStatus
    this.fileStatus = fileStatus // A (added), D (deleted), M (modified), E (equivalent)
    Object.defineProperty(this, 'destroyed', {value: false, enumerable: false, writable: true})
  }

  getPath () {
    return this.path
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
