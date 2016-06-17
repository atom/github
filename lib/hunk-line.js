/** @babel */

export default class HunkLine {
  constructor (text, status, oldLineNumber, newLineNumber) {
    this.text = text
    this.status = status
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
  }
}
