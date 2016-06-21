/** @babel */

export default class HunkLine {
  constructor (text, status, oldLineNumber, newLineNumber) {
    this.text = text
    this.status = status
    this.oldLineNumber = oldLineNumber
    this.newLineNumber = newLineNumber
  }

  getRawLine () {
    return this.rawLine
  }

  invert () {
    let invertedStatus
    if (this.status === 'added') {
      invertedStatus = 'removed'
    } else if (this.status === 'removed') {
      invertedStatus = 'added'
    } else {
      invertedStatus = 'unchanged'
    }
    return new HunkLine(
      this.text,
      invertedStatus,
      this.newLineNumber,
      this.oldLineNumber
    )
  }

  toString () {
    let modifier
    if (this.status === 'added') {
      modifier = '+'
    } else if (this.status === 'removed') {
      modifier = '-'
    } else if (this.status === 'unchanged') {
      modifier = ' '
    } else {
      modifier = ''
    }

    return modifier + this.text
  }
}
