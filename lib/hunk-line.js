/** @babel */

export default class HunkLine {
  constructor (text, status, oldLineNumber, newLineNumber, rawLine) {
    this.text = text
    this.status = status
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
    Object.defineProperty(this, 'rawLine', {value: rawLine, enumerable: false})
  }

  getRawLine () {
    return this.rawLine
  }
}
