/** @babel */

export default class FileDiff {
  constructor (oldPath, newPath, oldMode, newMode, status, hunks) {
    this.oldPath = oldPath
    this.newPath = newPath
    this.oldMode = oldMode
    this.newMode = newMode
    this.status = status
    this.hunks = hunks
  }

  getOldPath () {
    return this.oldPath
  }

  getNewPath () {
    return this.newPath
  }

  getOldMode () {
    return this.oldMode
  }

  getNewMode () {
    return this.newMode
  }

  getStatus () {
    return this.status
  }

  getHunks () {
    return this.hunks
  }

  toString () {
    return this.getHunks().map(h => h.toString()).join('\n')
  }
}
