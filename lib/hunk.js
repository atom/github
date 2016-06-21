/** @babel */

export default class Hunk {
  constructor (lines, header) {
    this.lines = lines
    this.header = header
  }

  getLines () {
    return this.lines
  }

  getHeader () {
    return this.header
  }

  toString () {
    return this.getLines().reduce((a, b) => a + '\n' + b.toString(), this.getHeader())
  }
}
