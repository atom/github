/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.hunks = hunks
    this.lineSelections = []
  }

  updateHunks (hunks) {
    const selectedLineRanges = this.getSelectedLineRanges()
    const lineIndexOfPreviousSelection =
      (selectedLineRanges.length > 0)
        ? selectedLineRanges[selectedLineRanges.length - 1].start
        : 0

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

    this.lineSelections = [{head: lineIndexOfNewSelection, tail: lineIndexOfNewSelection}]
  }

  selectLine (hunk, line, add) {
    const lineIndex = this.getLineIndex(hunk, line)
    const selection = {head: lineIndex, tail: lineIndex}
    if (add) {
      this.lineSelections.unshift(selection)
    } else {
      this.lineSelections = [selection]
    }
  }

  selectToLine (hunk, line) {
    const lineIndex = this.getLineIndex(hunk, line)
    this.lineSelections[0].head = lineIndex
  }

  getSelectedLines () {
    const selectedLines = []
    let hunks = this.hunks.slice()
    let hunkStartIndex = 0

    for (let range of this.getSelectedLineRanges()) {
      const rangeStart = range.start
      const rangeEnd = range.end

      // Discard hunks preceding current range
      while (hunkStartIndex + hunks[0].lines.length <= rangeStart) {
        hunkStartIndex += hunks[0].lines.length
        hunks.shift()
      }

      // Slice selected lines from hunks intersecting current range
      while (true) {
        const sliceStart = Math.max(0, rangeStart - hunkStartIndex)
        const sliceEnd = rangeEnd - hunkStartIndex + 1
        selectedLines.push(...hunks[0].lines.slice(sliceStart, sliceEnd).filter(l => l.isChanged()))

        if (hunkStartIndex + hunks[0].lines.length < rangeEnd) {
          hunkStartIndex += hunks[0].lines.length
          hunks.shift()
        } else {
          break
        }
      }
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

  getSelectedLineRanges () {
    let ranges = this.lineSelections
      .map(({head, tail}) => {return {start: Math.min(head, tail), end: Math.max(head, tail)}})
      .sort((a, b) => a.start - b.start)

    let i = 0
    while (true) {
      const range = ranges[i]
      const nextRange = ranges[i + 1]
      if (!nextRange) break
      if (nextRange.start <= range.end) {
        range.end = Math.max(range.end, nextRange.end)
        ranges.splice(i + 1, 1)
      } else {
        i++
      }
    }

    return ranges
  }
}
