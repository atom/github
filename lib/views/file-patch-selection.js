/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.hunks = hunks
  }

  updateHunks (hunks) {
    this.hunks = hunks
    this.lineSelectionHead = Math.min(this.lineSelectionHead, this.lineSelectionTail)
    this.lineSelectionTail = this.lineSelectionHead
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
      const hunkLines = hunk.getChangedLines()
      const hunkEndIndex = hunkStartIndex + hunkLines.length
      if (lineSelectionStart <= hunkEndIndex && lineSelectionEnd >= hunkStartIndex) {
        const sliceStart = Math.max(0, lineSelectionStart - hunkStartIndex)
        const sliceEnd = lineSelectionEnd - hunkStartIndex + 1
        selectedLines.push(...hunkLines.slice(sliceStart, sliceEnd))
      }
      hunkStartIndex = hunkEndIndex
    }

    return selectedLines
  }

  getLineIndex (containingHunk, line) {
    let index = 0
    for (let hunk of this.hunks) {
      const hunkLines = hunk.getChangedLines()
      if (hunk === containingHunk) {
        index += hunkLines.indexOf(line)
        break
      } else {
        index += hunkLines.length
      }
    }

    if (index < 0) throw new Error('Hunk does not contain line')
    return index
  }
}
