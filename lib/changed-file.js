/** @babel */

export default class ChangedFile {
  constructor (oldName, newName, status) {
    this.newName = newName
    this.oldName = oldName
    this.status = status
  }

  getOldFileName () {
    return this.oldName
  }

  getNewFileName () {
    return this.newName
  }

  getStatus () {
    return this.status
  }
}
