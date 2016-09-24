/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.hunks = hunks
  }

  updateHunks (hunks) {
    const lineIndexOfPreviousSelection = Math.min(this.lineSelectionHead, this.lineSelectionTail)

    let changedLineIndexOfPreviousSelection = 0
    let lineIndex = 0
    outerLoop: for (let hunk of this.hunks) {
      for (let line of hunk.lines) {
        if (lineIndex === lineIndexOfPreviousSelection) break outerLoop
        if (line.isChanged()) changedLineIndexOfPreviousSelection++
        lineIndex++
      }
    }

    this.hunks = hunks

    let lineIndexOfNewSelection = 0
    let changedLineIndex = 0
    outerLoop: for (let hunk of this.hunks) {
      for (let line of hunk.lines) {
        if (line.isChanged()) {
          if (changedLineIndex === changedLineIndexOfPreviousSelection) break outerLoop
          changedLineIndex++
        }
        lineIndexOfNewSelection++
      }
    }

    this.lineSelectionHead = lineIndexOfNewSelection
    this.lineSelectionTail = lineIndexOfNewSelection
  }

  selectLine (hunk, line, expand = false) {
    const lineIndex = this.getLineIndex(hunk, line)
    this.lineSelectionHead = lineIndex
    if (!expand) this.lineSelectionTail = lineIndex
  }

  getSelectedLines () {
    const selectedLines = []
    const lineSelectionStart = Math.min(this.lineSelectionHead, this.lineSelectionTail)
    const lineSelectionEnd = Math.max(this.lineSelectionHead, this.lineSelectionTail)

    let hunkStartIndex = 0
    for (let hunk of this.hunks) {
      const hunkEndIndex = hunkStartIndex + hunk.lines.length
      if (lineSelectionStart <= hunkEndIndex && lineSelectionEnd >= hunkStartIndex) {
        const sliceStart = Math.max(0, lineSelectionStart - hunkStartIndex)
        const sliceEnd = lineSelectionEnd - hunkStartIndex + 1
        selectedLines.push(...hunk.lines.slice(sliceStart, sliceEnd).filter(l => l.isChanged()))
      }
      hunkStartIndex = hunkEndIndex
    }

    return selectedLines
  }

  getLineIndex (containingHunk, line) {
    let index = 0
    for (let hunk of this.hunks) {
      if (hunk === containingHunk) {
        index += hunk.lines.indexOf(line)
        break
      } else {
        index += hunk.lines.length
      }
    }

    if (index < 0) throw new Error('Hunk does not contain line')
    return index
  }
}
