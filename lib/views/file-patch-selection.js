/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.hunks = hunks
    this.mode = 'hunk'
    this.hunkSelections = [{head: 0, tail: 0}]
    this.lineSelections = []
  }

  toggleMode () {
    if (this.mode === 'hunk') {
      this.mode = 'line'
      const currentHunk = this.hunks[this.hunkSelections[0].head]
      const firstHunkLineLocation = this.getLineLocation(currentHunk, currentHunk.lines[0])
      this.lineSelections = [{head: firstHunkLineLocation, tail: firstHunkLineLocation}]
      this.hunkSelections = []
      if (!currentHunk.lines[0].isChanged()) this.selectNextLine()
    } else {
      this.mode = 'hunk'
      const currentHunkIndex = this.lineSelections[0].head.hunkIndex
      this.hunkSelections = [{head: currentHunkIndex, tail: currentHunkIndex}]
      this.lineSelections = []
    }
  }

  getMode () {
    return this.mode
  }

  selectNext () {
    if (this.mode === 'hunk') {
      this.selectNextHunk()
    } else {
      this.selectNextLine()
    }
  }

  selectToNext () {
    if (this.mode === 'hunk') {
      this.selectToNextHunk()
    } else {
      this.selectToNextLine()
    }
  }

  selectPrevious () {
    if (this.mode === 'hunk') {
      this.selectPreviousHunk()
    } else {
      this.selectPreviousLine()
    }
  }

  selectToPrevious () {
    if (this.mode === 'hunk') {
      this.selectToPreviousHunk()
    } else {
      this.selectToPreviousLine()
    }
  }

  selectHunk (hunk, add) {
    const hunkIndex = this.hunks.indexOf(hunk)
    if (hunkIndex === -1) throw new Error('Hunk not found')
    const selection = {head: hunkIndex, tail: hunkIndex}
    if (add) {
      this.hunkSelections.unshift(selection)
    } else {
      this.hunkSelections = [selection]
    }

    if (this.mode === 'line') {
      this.mode = 'hunk'
      this.lineSelections = []
    }
  }

  selectToHunk (hunk) {
    const hunkIndex = this.hunks.indexOf(hunk)
    this.hunkSelections[0].head = hunkIndex
  }

  selectNextHunk (expandSelection) {
    let hunkIndex = this.hunkSelections[0].head
    if (hunkIndex < this.hunks.length - 1) hunkIndex++
    const nextHunk = this.hunks[hunkIndex]
    if (expandSelection) {
      this.selectToHunk(nextHunk)
    } else {
      this.selectHunk(nextHunk)
    }
  }

  selectToNextHunk () {
    this.selectNextHunk(true)
  }

  selectPreviousHunk (expandSelection) {
    let hunkIndex = this.hunkSelections[0].head
    if (hunkIndex > 0) hunkIndex--
    const previousHunk = this.hunks[hunkIndex]
    if (expandSelection) {
      this.selectToHunk(previousHunk)
    } else {
      this.selectHunk(previousHunk)
    }
  }

  selectToPreviousHunk () {
    this.selectPreviousHunk(true)
  }

  getSelectedHunks (hunk) {
    const selectedHunks = []
    for (let range of this.getSelectedHunkRanges()) {
      selectedHunks.push(...this.hunks.slice(range.start, range.end + 1))
    }
    return selectedHunks
  }

  selectLine (hunk, line, add) {
    const location = this.getLineLocation(hunk, line)
    const selection = {head: location, tail: location}
    if (add) {
      this.lineSelections.unshift(selection)
    } else {
      this.lineSelections = [selection]
    }

    if (this.mode === 'hunk') {
      this.mode = 'line'
      this.hunkSelections = []
    }
  }

  selectToLine (hunk, line) {
    const location = this.getLineLocation(hunk, line)
    this.lineSelections[0].head = location
  }

  selectNextLine (expandSelection = false) {
    let {hunkIndex, lineIndex} = this.lineSelections[0].head
    let nextHunk = this.hunks[hunkIndex]
    let nextLine = nextHunk.lines[lineIndex]

    while (true) {
      if (lineIndex < this.hunks[hunkIndex].lines.length - 1) {
        lineIndex++
      } else if (hunkIndex < this.hunks.length - 1) {
        hunkIndex++
        lineIndex = 0
      } else {
        break
      }

      const hunk = this.hunks[hunkIndex]
      const line = hunk.lines[lineIndex]
      if (line.isChanged()) {
        nextHunk = hunk
        nextLine = line
        break
      }
    }

    if (expandSelection) {
      this.selectToLine(nextHunk, nextLine)
    } else {
      this.selectLine(nextHunk, nextLine)
    }
  }

  selectToNextLine () {
    this.selectNextLine(true)
  }

  selectPreviousLine (expandSelection = false) {
    let {hunkIndex, lineIndex} = this.lineSelections[0].head
    let nextHunk = this.hunks[hunkIndex]
    let nextLine = nextHunk.lines[lineIndex]

    while (true) {
      if (lineIndex > 0) {
        lineIndex--
      } else if (hunkIndex > 0) {
        hunkIndex--
        lineIndex = this.hunks[hunkIndex].lines.length - 1
      } else {
        break
      }

      const hunk = this.hunks[hunkIndex]
      const line = hunk.lines[lineIndex]
      if (line.isChanged()) {
        nextHunk = hunk
        nextLine = line
        break
      }
    }

    if (expandSelection) {
      this.selectToLine(nextHunk, nextLine)
    } else {
      this.selectLine(nextHunk, nextLine)
    }
  }

  selectToPreviousLine () {
    this.selectPreviousLine(true)
  }

  reduceToOneLineSelection () {
    const mostRecentHead = this.lineSelections[0].head
    this.lineSelections = [{head: mostRecentHead, tail: mostRecentHead}]
  }

  getSelectedLines () {
    if (this.mode === 'hunk') {
      return this.getSelectedHunks()
        .map(hunk => hunk.lines.filter(line => line.isChanged()))
        .reduce((a, b) => a.concat(b))
    } else {
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
  }

  getLineLocation (hunk, line) {
    const hunkIndex = this.hunks.indexOf(hunk)
    if (hunkIndex === -1) throw new Error('Hunk not found')
    const lineIndex = hunk.lines.indexOf(line)
    if (lineIndex === -1) throw new Error('Line not found')

    return {hunkIndex, lineIndex}
  }

  getSelectedHunkRanges () {
    const selections =
      (this.mode === 'hunk')
        ? this.hunkSelections
        : this.lineSelections.map(({head, tail}) => {
          return {head: head.hunkIndex, tail: tail.hunkIndex}
        })

    return mergeSelectedRanges(selections, compareNumbers, Math.max, Math.min)
  }

  getSelectedLineRanges () {
    return mergeSelectedRanges(this.lineSelections, compareLineLocations, maxLineLocation, minLineLocation)
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

function mergeSelectedRanges (selections, compare, max, min) {
  let ranges = selections
    .map(({head, tail}) => {return {start: min(head, tail), end: max(head, tail)}})
    .sort((a, b) => compare(a.start, b.start))

  let i = 0
  while (true) {
    const range = ranges[i]
    const nextRange = ranges[i + 1]
    if (!nextRange) break
    if (compare(nextRange.start, range.end) <= 0) {
      range.end = max(range.end, nextRange.end)
      ranges.splice(i + 1, 1)
    } else {
      i++
    }
  }

  return ranges
}

function maxLineLocation (a, b) {
  return (compareLineLocations(a, b) >= 0) ? a : b
}

function minLineLocation (a, b) {
  return (compareLineLocations(a, b) <= 0) ? a : b
}

function compareLineLocations (a, b) {
  const hunkComparison = compareNumbers(a.hunkIndex, b.hunkIndex)
  if (hunkComparison === 0) {
   return compareNumbers(a.lineIndex, b.lineIndex)
 } else {
   return hunkComparison
 }
}

function compareNumbers(a, b) {
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}
