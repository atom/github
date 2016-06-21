/** @babel */

export default class Hunk {
  constructor (lines, oldStartRow, newStartRow, oldRowCount, newRowCount) {
    this.lines = lines
    this.oldStartRow = oldStartRow
    this.newStartRow = newStartRow
    this.oldRowCount = oldRowCount
    this.newRowCount = newRowCount
  }

  getLines () {
    return this.lines
  }

  getHeader () {
    return `@@ -${this.oldStartRow},${this.oldRowCount} +${this.newStartRow},${this.newRowCount} @@\n`
  }

  invert () {
    return new Hunk(
      this.lines.map(l => l.invert()),
      this.newStartRow,
      this.oldStartRow,
      this.newRowCount,
      this.oldRowCount
    )
  }

  toString () {
    return this.getLines().reduce((a, b) => a + b.toString(), this.getHeader())
  }
}
