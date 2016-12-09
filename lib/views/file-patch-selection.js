/** @babel */

import ListSelection from './list-selection';

export default class FilePatchSelection {
  constructor(hunks) {
    this.mode = 'hunk';
    this.hunksSelection = new ListSelection();
    this.linesSelection = new ListSelection({isItemSelectable: line => line.isChanged()});
    this.resolveNextUpdatePromise = () => {};
    this.updateHunks(hunks);
  }

  toggleMode() {
    if (this.mode === 'hunk') {
      const firstLineOfSelectedHunk = this.getHeadHunk().lines[0];
      this.selectLine(firstLineOfSelectedHunk);
      if (!firstLineOfSelectedHunk.isChanged()) { this.selectNextLine(); }
    } else {
      const selectedLine = this.getHeadLine();
      const hunkContainingSelectedLine = this.hunksByLine.get(selectedLine);
      this.selectHunk(hunkContainingSelectedLine);
    }
  }

  getMode() {
    return this.mode;
  }

  selectNext(preserveTail = false) {
    if (this.mode === 'hunk') {
      this.selectNextHunk(preserveTail);
    } else {
      this.selectNextLine(preserveTail);
    }
  }

  selectPrevious(preserveTail = false) {
    if (this.mode === 'hunk') {
      this.selectPreviousHunk(preserveTail);
    } else {
      this.selectPreviousLine(preserveTail);
    }
  }

  selectAll() {
    if (this.mode === 'hunk') {
      this.selectAllHunks();
    } else {
      this.selectAllLines();
    }
  }

  selectFirst(preserveTail) {
    if (this.mode === 'hunk') {
      this.selectFirstHunk(preserveTail);
    } else {
      this.selectFirstLine(preserveTail);
    }
  }

  selectLast(preserveTail) {
    if (this.mode === 'hunk') {
      this.selectLastHunk(preserveTail);
    } else {
      this.selectLastLine(preserveTail);
    }
  }

  selectHunk(hunk, preserveTail = false) {
    this.mode = 'hunk';
    this.hunksSelection.selectItem(hunk, preserveTail);
  }

  addOrSubtractHunkSelection(hunk) {
    this.mode = 'hunk';
    this.hunksSelection.addOrSubtractSelection(hunk);
  }

  selectAllHunks() {
    this.mode = 'hunk';
    this.hunksSelection.selectAllItems();
  }

  selectFirstHunk(preserveTail) {
    this.mode = 'hunk';
    this.hunksSelection.selectFirstItem(preserveTail);
  }

  selectLastHunk(preserveTail) {
    this.mode = 'hunk';
    this.hunksSelection.selectLastItem(preserveTail);
  }

  selectNextHunk(preserveTail) {
    this.mode = 'hunk';
    this.hunksSelection.selectNextItem(preserveTail);
  }

  selectPreviousHunk(preserveTail) {
    this.mode = 'hunk';
    this.hunksSelection.selectPreviousItem(preserveTail);
  }

  getSelectedHunks(hunk) {
    if (this.mode === 'line') {
      const selectedHunks = new Set();
      const selectedLines = this.getSelectedLines();
      selectedLines.forEach(line => selectedHunks.add(this.hunksByLine.get(line)));
      return selectedHunks;
    } else {
      return this.hunksSelection.getSelectedItems();
    }
  }

  getHeadHunk() {
    return this.mode === 'hunk' ? this.hunksSelection.getHeadItem() : null;
  }

  selectLine(line, preserveTail = false) {
    this.mode = 'line';
    this.linesSelection.selectItem(line, preserveTail);
  }

  addOrSubtractLineSelection(line) {
    this.mode = 'line';
    this.linesSelection.addOrSubtractSelection(line);
  }

  selectAllLines(preserveTail) {
    this.mode = 'line';
    this.linesSelection.selectAllItems(preserveTail);
  }

  selectFirstLine(preserveTail) {
    this.mode = 'line';
    this.linesSelection.selectFirstItem(preserveTail);
  }

  selectLastLine(preserveTail) {
    this.mode = 'line';
    this.linesSelection.selectLastItem(preserveTail);
  }

  selectNextLine(preserveTail = false) {
    this.mode = 'line';
    this.linesSelection.selectNextItem(preserveTail);
  }

  selectPreviousLine(preserveTail = false) {
    this.mode = 'line';
    this.linesSelection.selectPreviousItem(preserveTail);
  }

  getSelectedLines() {
    if (this.mode === 'hunk') {
      const selectedLines = new Set();
      this.getSelectedHunks().forEach(hunk => {
        for (const line of hunk.lines) {
          if (line.isChanged()) { selectedLines.add(line); }
        }
      });
      return selectedLines;
    } else {
      return this.linesSelection.getSelectedItems();
    }
  }

  getHeadLine() {
    return this.mode === 'line' ? this.linesSelection.getHeadItem() : null;
  }

  updateHunks(newHunks) {
    const oldHunks = this.hunksSelection.getItems();

    let wasChanged = false;
    if (newHunks.length !== oldHunks.length) {
      wasChanged = true;
    } else {
      for (let i = 0; i < oldHunks.length; i++) {
        if (oldHunks[i] !== newHunks[i]) {
          wasChanged = true;
          break;
        }
      }
    }

    this.hunksByLine = new Map();
    const newLines = [];
    for (const hunk of newHunks) {
      for (const line of hunk.lines) {
        newLines.push(line);
        this.hunksByLine.set(line, hunk);
      }
    }

    // Update hunks, preserving selection index
    this.hunksSelection.setItems(newHunks);

    // Update lines, preserving selection index in *changed* lines
    const oldLines = this.linesSelection.getItems();
    let newSelectedLine;
    if (oldLines.length > 0 && newLines.length > 0) {
      const oldSelectionStartIndex = this.linesSelection.getMostRecentSelectionStartIndex();
      let changedLineCount = 0;
      for (let i = 0; i < oldSelectionStartIndex; i++) {
        if (oldLines[i].isChanged()) { changedLineCount++; }
      }

      for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i];
        if (line.isChanged()) {
          newSelectedLine = line;
          if (changedLineCount === 0) { break; }
          changedLineCount--;
        }
      }
    }
    this.linesSelection.setItems(newLines);
    if (newSelectedLine) { this.linesSelection.selectItem(newSelectedLine); }

    if (wasChanged) { this.resolveNextUpdatePromise(); }
  }

  coalesce() {
    this.hunksSelection.coalesce();
    this.linesSelection.coalesce();
  }

  getNextUpdatePromise() {
    return new Promise((resolve, reject) => {
      this.resolveNextUpdatePromise = resolve;
    });
  }
}
