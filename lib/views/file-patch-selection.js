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

    lineIndex = 0
    let changedLineIndex = 0
    let lineIndexOfNewSelection = -1
    outerLoop: for (let hunk of this.hunks) {
      for (let line of hunk.lines) {
        if (line.isChanged()) {
          lineIndexOfNewSelection = lineIndex
          if (changedLineIndex === changedLineIndexOfPreviousSelection) break outerLoop
          changedLineIndex++
        }
        lineIndex++
      }
    }

    if (lineIndexOfNewSelection >= 0) {
      this.lineSelections = [{head: lineIndexOfNewSelection, tail: lineIndexOfNewSelection}]
    } else {
      this.lineSelections = []
    }
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

  selectNextLine () {
    let lineIndex = this.lineSelections[0].head
    let {hunk, hunkStartIndex} = this.hunkForLineIndex(lineIndex)
    while (true) {
      lineIndex++
      let line = hunk.lines[lineIndex - hunkStartIndex]
      if (!line) {
        ({hunk, hunkStartIndex} = this.hunkForLineIndex(lineIndex))
        if (hunk) {
          line = hunk.lines[0]
        } else {
          break
        }
      }

      if (line.isChanged()) {
        this.lineSelections[0].head = lineIndex
        this.lineSelections[0].tail = lineIndex
        break
      }
    }
  }

  selectPreviousLine () {
    let lineIndex = this.lineSelections[0].head
    let {hunk, hunkStartIndex} = this.hunkForLineIndex(lineIndex)
    while (true) {
      lineIndex--
      if (lineIndex < 0) break
      if (lineIndex < hunkStartIndex) {
        ({hunk, hunkStartIndex} = this.hunkForLineIndex(lineIndex))
        line = hunk.lines[hunk.lines.length - 1]
      } else {
        line = hunk.lines[lineIndex - hunkStartIndex]
      }

      if (line.isChanged()) {
        this.lineSelections[0].head = lineIndex
        this.lineSelections[0].tail = lineIndex
        break
      }
    }
  }

  hunkForLineIndex (index) {
    let hunkStartIndex = 0
    for (let hunk of this.hunks) {
      if (hunkStartIndex + hunk.lines.length > index) {
        return {hunk, hunkStartIndex}
      }
      hunkStartIndex += hunk.lines.length
    }
    return {hunk: null, hunkStartIndex}
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
