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

  invert () {
    let invertedStatus
    switch (this.getStatus()) {
      case 'modified':
        invertedStatus = 'modified'
        break
      case 'added':
        invertedStatus = 'removed'
        break
      case 'removed':
        invertedStatus = 'added'
        break
      case 'renamed':
        invertedStatus = 'renamed'
        break
      default:
        throw new Error(`Unknown Status: ${invertedStatus}`)
    }
    const invertedHunks = this.getHunks().map(h => h.invert())
    return new FileDiff(
      this.getNewPath(),
      this.getOldPath(),
      this.getNewMode(),
      this.getOldMode(),
      invertedStatus,
      invertedHunks
    )
  }

  toString () {
    return this.getHunks().map(h => h.toString()).join('')
  }
}
