/** @babel */

export default class FilePatchSelection {
  constructor (hunks) {
    this.mode = 'hunk'
    this.selections = [{head: 0, tail: 0}]
    this.updateHunks(hunks)
  }

  toggleMode () {
    if (this.mode === 'hunk') {
      this.mode = 'line'
      const firstLineOfSelectedHunk = this.hunks[this.selections[0].head].lines[0]
      this.selectLine(firstLineOfSelectedHunk)
      if (!firstLineOfSelectedHunk.isChanged()) this.selectNextLine()
    } else {
      this.mode = 'hunk'
      const selectedLine = this.lines[this.selections[0].head]
      const hunkContainingSelectedLine = this.hunksByLine.get(selectedLine)
      this.selectHunk(hunkContainingSelectedLine)
    }
  }

  getMode () {
    return this.mode
  }

  selectNext (preserveTail = false) {
    if (this.mode === 'hunk') {
      this.selectNextHunk(preserveTail)
    } else {
      this.selectNextLine(preserveTail)
    }
  }

  selectPrevious (preserveTail = false) {
    if (this.mode === 'hunk') {
      this.selectPreviousHunk(preserveTail)
    } else {
      this.selectPreviousLine(preserveTail)
    }
  }

  selectNextHunk (preserveTail) {
    let nextHunkIndex = this.selections[0].head
    if (nextHunkIndex < this.hunks.length - 1) nextHunkIndex++
    this.selectHunk(this.hunks[nextHunkIndex], preserveTail)
  }

  selectPreviousHunk (preserveTail) {
    let previousHunkIndex = this.selections[0].head
    if (previousHunkIndex > 0) previousHunkIndex--
    this.selectHunk(this.hunks[previousHunkIndex], preserveTail)
  }

  selectNextLine (preserveTail = false) {
    let lineIndex = this.selections[0].head
    let nextLineIndex = lineIndex

    while (lineIndex < this.lines.length - 1) {
      lineIndex++
      if (this.lines[lineIndex].isChanged()) {
        nextLineIndex = lineIndex
        break
      }
    }

    this.selectLine(this.lines[nextLineIndex], preserveTail)
  }

  selectPreviousLine (preserveTail = false) {
    let lineIndex = this.selections[0].head
    let previousLineIndex = lineIndex

    while (lineIndex > 0) {
      lineIndex--
      if (this.lines[lineIndex].isChanged()) {
        previousLineIndex = lineIndex
        break
      }
    }

    this.selectLine(this.lines[previousLineIndex], preserveTail)
  }


  selectHunk (hunk, preserveTail = false) {
    this.mode = 'hunk'
    this.selectItem(this.hunks, hunk, preserveTail, false)
  }

  selectLine (line, preserveTail = false) {
    this.mode = 'line'
    this.selectItem(this.lines, line, preserveTail, false)
  }

  coalesce () {
    const mostRecent = this.selections[0]
    let mostRecentStart = Math.min(mostRecent.head, mostRecent.tail)
    let mostRecentEnd = Math.max(mostRecent.head, mostRecent.tail)
    while (mostRecentStart > 0 && !this.lines[mostRecentStart - 1].isChanged()) {
      mostRecentStart--
    }
    while (mostRecentEnd < (this.lines.length - 1) && !this.lines[mostRecentEnd + 1].isChanged()) {
      mostRecentEnd++
    }

    for (let i = 1; i < this.selections.length;) {
      const current = this.selections[i]
      const currentStart = Math.min(current.head, current.tail)
      const currentEnd = Math.max(current.head, current.tail)
      if (mostRecentStart <= currentEnd + 1 && currentStart - 1 <= mostRecentEnd) {
        if (mostRecent.negate) {
          const truncatedSelections = []
          if (current.head > current.tail) {
            if (currentEnd > mostRecentEnd) { // suffix
              truncatedSelections.push({tail: mostRecentEnd + 1, head: currentEnd})
            }
            if (currentStart < mostRecentStart) { // prefix
              truncatedSelections.push({tail: currentStart, head: mostRecentStart - 1})
            }
          } else {
            if (currentStart < mostRecentStart) { // prefix
              truncatedSelections.push({head: currentStart, tail: mostRecentStart - 1})
            }
            if (currentEnd > mostRecentEnd) { // suffix
              truncatedSelections.push({head: mostRecentEnd + 1, tail: currentEnd})
            }
          }
          this.selections.splice(i, 1, ...truncatedSelections)
          i += truncatedSelections.length
        } else {
          if (mostRecent.head > mostRecent.tail) {
            mostRecent.head = Math.max(mostRecentEnd, currentEnd)
            mostRecent.tail = Math.min(mostRecentStart, currentStart)
          } else {
            mostRecent.head = Math.min(mostRecentStart, currentStart)
            mostRecent.tail = Math.max(mostRecentEnd, currentEnd)
          }
          this.selections.splice(i, 1)
        }
      } else {
        i++
      }
    }

    if (mostRecent.negate) this.selections.shift()
  }

  addHunkSelection (hunk) {
    this.mode = 'hunk'
    this.selectItem(this.hunks, hunk, false, true)
  }

  addOrSubtractLineSelection (line) {
    this.mode = 'line'
    this.selectItem(this.lines, line, false, true)
  }

  selectItem (items, item, preserveTail, addOrSubtract) {
    if (addOrSubtract && preserveTail) {
      throw new Error('addOrSubtract and preserveTail cannot both be true at the same time')
    }

    const itemIndex = items.indexOf(item)
    if (preserveTail) {
      this.selections[0].head = itemIndex
    } else {
      const selection = {head: itemIndex, tail: itemIndex}
      if (addOrSubtract) {
        if (this.getSelectedItems().has(item)) selection.negate = true
        this.selections.unshift(selection)
      } else {
        this.selections = [selection]
      }
    }
  }

  getSelectedHunks (hunk) {
    if (this.mode === 'line') {
      const selectedHunks = new Set()
      const selectedLines = this.getSelectedLines()
      selectedLines.forEach(line => selectedHunks.add(this.hunksByLine.get(line)))
      return selectedHunks
    } else {
      return this.getSelectedItems()
    }
  }

  getSelectedLines () {
    if (this.mode === 'hunk') {
      const selectedLines = new Set()
      this.getSelectedHunks().forEach(hunk => {
        for (let line of hunk.lines) {
          if (line.isChanged()) selectedLines.add(line)
        }
      })
      return selectedLines
    } else {
      return this.getSelectedItems()
    }
  }

  getSelectedItems () {
    const selectedItems = new Set()
    const items = (this.mode === 'hunk') ? this.hunks : this.lines
    for (let {head, tail, negate} of this.selections.slice().reverse()) {
      let start = Math.min(head, tail)
      let end = Math.max(head, tail)
      for (let i = start; i <= end; i++) {
        const item = items[i]
        if (this.mode === 'hunk' || item.isChanged()) {
          if (negate) {
            selectedItems.delete(item)
          } else {
            selectedItems.add(item)
          }
        }
      }
    }
    return selectedItems
  }

  updateHunks (hunks) {
    const oldLines = this.lines
    this.hunks = hunks
    this.lines = []
    this.hunksByLine = new Map()
    for (let hunk of hunks) {
      for (let line of hunk.lines) {
        this.lines.push(line)
        this.hunksByLine.set(line, hunk)
      }
    }

    if (this.lines.length > 0) {
      const oldSelectionStart = Math.min(this.selections[0].head, this.selections[0].tail)
      let newSelectionHeadAndTail

      if (this.mode === 'hunk') {
        newSelectionHeadAndTail = Math.min(this.hunks.length - 1, oldSelectionStart)
      } else {
        let changedLineCount = 0
        for (let i = 0; i < oldSelectionStart; i++) {
          if (oldLines[i].isChanged()) changedLineCount++
        }

        for (let i = 0; i < this.lines.length; i++) {
          if (this.lines[i].isChanged()) {
            newSelectionHeadAndTail = i
            if (changedLineCount === 0) break
            changedLineCount--
          }
        }
      }

      this.selections = [{head: newSelectionHeadAndTail, tail: newSelectionHeadAndTail}]
    } else {
      this.selections = []
    }
  }
}
