/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.hunks = hunks
    this.lineSelections = []
  }

  selectLine (hunk, line, add) {
    const location = this.getLineLocation(hunk, line)
    const selection = {head: location, tail: location}
    if (add) {
      this.lineSelections.unshift(selection)
    } else {
      this.lineSelections = [selection]
    }
  }

  selectToLine (hunk, line) {
    const location = this.getLineLocation(hunk, line)
    this.lineSelections[0].head = location
  }

  selectNextLine (expandSelection = false) {
    let {hunkIndex, lineIndex} = this.lineSelections[0].head

    while (true) {
      if (lineIndex < this.hunks[hunkIndex].lines.length - 1) {
        lineIndex++
      } else if (hunkIndex < this.hunks.length - 1) {
        hunkIndex++
        lineIndex = 0
      } else {
        break
      }

      const line = this.hunks[hunkIndex].lines[lineIndex]
      if (line.isChanged()) {
        const location = {hunkIndex, lineIndex}
        this.lineSelections[0].head = location
        if (!expandSelection) this.lineSelections[0].tail = location
        break
      }
    }
  }

  selectToNextLine () {
    this.selectNextLine(true)
  }

  selectPreviousLine (expandSelection = false) {
    let {hunkIndex, lineIndex} = this.lineSelections[0].head

    while (true) {
      if (lineIndex > 0) {
        lineIndex--
      } else if (hunkIndex > 0) {
        hunkIndex--
        lineIndex = this.hunks[hunkIndex].lines.length - 1
      } else {
        break
      }

      const line = this.hunks[hunkIndex].lines[lineIndex]
      if (line.isChanged()) {
        const location = {hunkIndex, lineIndex}
        this.lineSelections[0].head = location
        if (!expandSelection) this.lineSelections[0].tail = location
        break
      }
    }
  }

  selectToPreviousLine () {
    this.selectPreviousLine(true)
  }

  getSelectedLines () {
    const selectedLines = []
    let hunkIndex = 0

    for (let range of this.getSelectedLineRanges()) {
      const rangeStart = range.start
      const rangeEnd = range.end

      // Skip hunks preceding current range
      while (hunkIndex < rangeStart.hunkIndex) hunkIndex++

      // Slice selected lines from hunks intersecting current range
      while (true) {
        const hunk = this.hunks[hunkIndex]
        const sliceStart = (hunkIndex === rangeStart.hunkIndex) ? rangeStart.lineIndex : 0
        const sliceEnd = (hunkIndex === rangeEnd.hunkIndex) ? rangeEnd.lineIndex + 1 : hunk.lines.length
        selectedLines.push(...hunk.lines.slice(sliceStart, sliceEnd).filter(l => l.isChanged()))
        if (rangeEnd.hunkIndex === hunkIndex) break
        hunkIndex++
      }
    }

    return selectedLines
  }

  getLineLocation (hunk, line) {
    return {
      hunkIndex: this.hunks.indexOf(hunk),
      lineIndex: hunk.lines.indexOf(line)
    }
  }

  getSelectedLineRanges () {
    let ranges = this.lineSelections
      .map(({head, tail}) => {return {start: minLocation(head, tail), end: maxLocation(head, tail)}})
      .sort((a, b) => compareLocations(a.start, b.start))

    let i = 0
    while (true) {
      const range = ranges[i]
      const nextRange = ranges[i + 1]
      if (!nextRange) break
      if (compareLocations(nextRange.start, range.end) <= 0) {
        range.end = maxLocation(range.end, nextRange.end)
        ranges.splice(i + 1, 1)
      } else {
        i++
      }
    }

    return ranges
  }

  updateHunks (hunks) {
    const selectedLineRanges = this.getSelectedLineRanges()
    const previousSelectionLocation =
      (selectedLineRanges.length > 0)
        ? selectedLineRanges[selectedLineRanges.length - 1].start
        : 0

    let previousSelectionChangedLineIndex = 0
    for (let i = 0; i < this.hunks.length; i++) {
      const hunk = this.hunks[i]
      const lines =
        (i < previousSelectionLocation.hunkIndex)
          ? hunk.lines
          : hunk.lines.slice(0, previousSelectionLocation.lineIndex)
      previousSelectionChangedLineIndex += lines.filter(l => l.isChanged()).length
    }

    this.hunks = hunks

    let newSelectionLocation
    let changedLineIndex = 0
    hunkLoop: for (let hunkIndex = 0; hunkIndex < this.hunks.length; hunkIndex++) {
      const hunk = this.hunks[hunkIndex]
      for (let lineIndex = 0; lineIndex < hunk.lines.length; lineIndex++) {
        const line = hunk.lines[lineIndex]
        if (line.isChanged()) {
          newSelectionLocation = {hunkIndex, lineIndex}
          if (changedLineIndex === previousSelectionChangedLineIndex) break hunkLoop
          changedLineIndex++
        }
      }
    }

    if (newSelectionLocation) {
      this.lineSelections = [{head: newSelectionLocation, tail: newSelectionLocation}]
    } else {
      this.lineSelections = []
    }
  }
}

function maxLocation (a, b) {
  return (compareLocations(a, b) >= 0) ? a : b
}

function minLocation (a, b) {
  return (compareLocations(a, b) <= 0) ? a : b
}

function compareLocations (a, b) {
  const hunkComparison = compare(a.hunkIndex, b.hunkIndex)
  if (hunkComparison === 0) {
   return compare(a.lineIndex, b.lineIndex)
 } else {
   return hunkComparison
 }
}

function compare(a, b) {
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}
