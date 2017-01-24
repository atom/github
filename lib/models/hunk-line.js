export default class HunkLine {
  static statusMap = {
    '+': 'added',
    '-': 'deleted',
    ' ': 'unchanged',
    '\\': 'nonewline',
  }

  constructor(text, status, oldLineNumber, newLineNumber, diffLineNumber) {
    this.text = text;
    this.status = status;
    this.oldLineNumber = oldLineNumber;
    this.newLineNumber = newLineNumber;
    this.diffLineNumber = diffLineNumber;
  }

  copy({text, status, oldLineNumber, newLineNumber} = {}) {
    return new HunkLine(
      text || this.getText(),
      status || this.getStatus(),
      oldLineNumber || this.getOldLineNumber(),
      newLineNumber || this.getNewLineNumber(),
    );
  }

  getText() {
    return this.text;
  }

  getOldLineNumber() {
    return this.oldLineNumber;
  }

  getNewLineNumber() {
    return this.newLineNumber;
  }

  getStatus() {
    return this.status;
  }

  isChanged() {
    return this.getStatus() === 'added' || this.getStatus() === 'deleted';
  }

  getOrigin() {
    switch (this.getStatus()) {
      case 'added':
        return '+';
      case 'deleted':
        return '-';
      case 'unchanged':
        return ' ';
      case 'nonewline':
        return '\\';
      default:
        return '';
    }
  }

  invert() {
    let invertedStatus;
    switch (this.getStatus()) {
      case 'added':
        invertedStatus = 'deleted';
        break;
      case 'deleted':
        invertedStatus = 'added';
        break;
      case 'unchanged':
        invertedStatus = 'unchanged';
        break;
      case 'nonewline':
        invertedStatus = 'nonewline';
        break;
    }

    return new HunkLine(
      this.text,
      invertedStatus,
      this.newLineNumber,
      this.oldLineNumber,
    );
  }

  toString() {
    return this.getOrigin() + (this.getStatus() === 'nonewline' ? ' ' : '') + this.getText();
  }
}
