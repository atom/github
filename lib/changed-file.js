/** @babel */

export default class ChangedFile {
  constructor (oldName, newName, status, hunks) {
    this.newName = newName
    this.oldName = oldName
    this.status = status
    this.hunks = hunks
  }

  getOldName () {
    return this.oldName
  }

  getNewName () {
    return this.newName
  }

  getStatus () {
    return this.status
  }
}
