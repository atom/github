/** @babel */

import {diffLines} from 'diff'

export default class Hunk {
  constructor (oldStartRow, newStartRow, oldRowCount, newRowCount, lines) {
    this.oldStartRow = oldStartRow
    this.newStartRow = newStartRow
    this.oldRowCount = oldRowCount
    this.newRowCount = newRowCount
    this.lines = lines
  }

  copy () {
    return new Hunk(
      this.getOldStartRow(),
      this.getNewStartRow(),
      this.getOldRowCount(),
      this.getNewRowCount(),
      this.getLines().map(l => l.copy())
    )
  }

  sharesLinesWith (hunk) {
    const otherLines = hunk.getUniqueLinesContents()
    for (let line of this.getUniqueLinesContents()) {
      if (otherLines.has(line)) {
        return true
      }
    }
    return false
  }

  update (hunk) {
    this.oldStartRow = hunk.getOldStartRow()
    this.newStartRow = hunk.getNewStartRow()
    this.oldRowCount = hunk.getOldRowCount()
    this.newRowCount = hunk.getNewRowCount()

    const newLines = hunk.getLines()
    const oldText = this.lines.map(l => l.toString()).join('\n') + '\n'
    const newText = newLines.map(l => l.toString()).join('\n') + '\n'
    let oldLineIndex = 0
    let newLineIndex = 0
    for (let diff of diffLines(oldText, newText)) {
      if (diff.removed) {
        this.lines.splice(oldLineIndex, diff.count)
      } else if (diff.added) {
        this.lines.splice(oldLineIndex, 0, ...newLines.slice(newLineIndex, newLineIndex + diff.count))
        oldLineIndex += diff.count
        newLineIndex += diff.count
      } else {
        for (let i = 0; i < diff.count; i++) {
          this.lines[oldLineIndex].update(newLines[newLineIndex])
          oldLineIndex++
          newLineIndex++
        }
      }
    }
  }

  getOldStartRow () {
    return this.oldStartRow
  }

  getNewStartRow () {
    return this.newStartRow
  }

  getOldRowCount () {
    return this.oldRowCount
  }

  getNewRowCount () {
    return this.newRowCount
  }

  getLines () {
    return this.lines
  }

  getUniqueLinesContents () {
    const lines = new Set()
    const duplicatedLines = new Set()
    for (let line of this.getLines()) {
      const content = line.getText().trim()
      if (duplicatedLines.has(content)) {
        lines.delete(content)
      } else {
        lines.add(content)
        duplicatedLines.add(content)
      }
    }
    return lines
  }

  getHeader () {
    return `@@ -${this.oldStartRow},${this.oldRowCount} +${this.newStartRow},${this.newRowCount} @@\n`
  }

  invert () {
    let invertedLines = []
    let addedLines = []
    for (let line of this.getLines()) {
      let invertedLine = line.invert()
      if (invertedLine.getStatus() === 'added') {
        addedLines.push(invertedLine)
      } else if (invertedLine.getStatus() === 'removed') {
        invertedLines.push(invertedLine)
      } else {
        invertedLines.push(...addedLines)
        invertedLines.push(invertedLine)
        addedLines = []
      }
    }
    invertedLines.push(...addedLines)
    return new Hunk(
      this.getNewStartRow(),
      this.getOldStartRow(),
      this.getNewRowCount(),
      this.getOldRowCount(),
      invertedLines
    )
  }

  toString () {
    return this.getLines().reduce((a, b) => a + b.toString() + '\n', this.getHeader())
  }
}
