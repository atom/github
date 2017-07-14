import ListSelection from './list-selection';

const COPY = {};

export default class FilePatchSelection {
  constructor(hunks) {
    if (hunks._copy !== COPY) {
      // Initialize a new selection
      this.mode = 'hunk';

      this.hunksByLine = new Map();
      const lines = [];
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          lines.push(line);
          this.hunksByLine.set(line, hunk);
        }
      }

      this.hunksSelection = new ListSelection({items: hunks});
      // TODO: investigate if there's a better fix for line.isChanged error after discarding
      this.linesSelection = new ListSelection({items: lines, isItemSelectable: line => line && line.isChanged()});
      this.resolveNextUpdatePromise = () => {};
    } else {
      // Copy from options. *Only* reachable from the copy() method because no other module has visibility to
      // the COPY object without shenanigans.
      const options = hunks;

      this.mode = options.mode;
      this.hunksSelection = options.hunksSelection;
      this.linesSelection = options.linesSelection;
      this.resolveNextUpdatePromise = options.resolveNextUpdatePromise;
      this.hunksByLine = options.hunksByLine;
    }
  }

  copy(options = {}) {
    const mode = options.mode || this.mode;
    const hunksSelection = options.hunksSelection || this.hunksSelection.copy();
    const linesSelection = options.linesSelection || this.linesSelection.copy();

    let hunksByLine = null;
    if (options.hunks) {
      // Update hunks
      const oldHunks = this.hunksSelection.getItems();
      const newHunks = options.hunks;

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

      // Update hunks, preserving selection index
      hunksSelection.setItems(newHunks);

      const oldLines = this.linesSelection.getItems();
      const newLines = [];

      hunksByLine = new Map();
      for (const hunk of newHunks) {
        for (const line of hunk.lines) {
          newLines.push(line);
          hunksByLine.set(line, hunk);
        }
      }

      // Update lines, preserving selection index in *changed* lines
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

      linesSelection.setItems(newLines);
      if (newSelectedLine) { linesSelection.selectItem(newSelectedLine); }
      if (wasChanged) { this.resolveNextUpdatePromise(); }
    } else {
      // Hunks are unchanged. Don't recompute hunksByLine.
      hunksByLine = this.hunksByLine;
    }

    return new FilePatchSelection({
      _copy: COPY,
      mode,
      hunksSelection,
      linesSelection,
      hunksByLine,
      resolveNextUpdatePromise: options.resolveNextUpdatePromise || this.resolveNextUpdatePromise,
    });
  }

  toggleMode() {
    if (this.mode === 'hunk') {
      const firstLineOfSelectedHunk = this.getHeadHunk().lines[0];
      const selection = this.selectLine(firstLineOfSelectedHunk);
      if (!firstLineOfSelectedHunk.isChanged()) {
        return selection.selectNextLine();
      } else {
        return selection;
      }
    } else {
      const selectedLine = this.getHeadLine();
      const hunkContainingSelectedLine = this.hunksByLine.get(selectedLine);
      return this.selectHunk(hunkContainingSelectedLine);
    }
  }

  getMode() {
    return this.mode;
  }

  selectNext(preserveTail = false) {
    if (this.mode === 'hunk') {
      return this.selectNextHunk(preserveTail);
    } else {
      return this.selectNextLine(preserveTail);
    }
  }

  selectPrevious(preserveTail = false) {
    if (this.mode === 'hunk') {
      return this.selectPreviousHunk(preserveTail);
    } else {
      return this.selectPreviousLine(preserveTail);
    }
  }

  selectAll() {
    if (this.mode === 'hunk') {
      return this.selectAllHunks();
    } else {
      return this.selectAllLines();
    }
  }

  selectFirst(preserveTail) {
    if (this.mode === 'hunk') {
      return this.selectFirstHunk(preserveTail);
    } else {
      return this.selectFirstLine(preserveTail);
    }
  }

  selectLast(preserveTail) {
    if (this.mode === 'hunk') {
      return this.selectLastHunk(preserveTail);
    } else {
      return this.selectLastLine(preserveTail);
    }
  }

  selectHunk(hunk, preserveTail = false) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectItem(hunk, preserveTail);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  addOrSubtractHunkSelection(hunk) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.addOrSubtractSelection(hunk);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  selectAllHunks() {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectAllItems();

    return this.copy({mode: 'hunk', hunksSelection});
  }

  selectFirstHunk(preserveTail) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectFirstItem(preserveTail);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  selectLastHunk(preserveTail) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectLastItem(preserveTail);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  jumpToNextHunk() {
    const next = this.selectNextHunk();
    return next.getMode() !== this.mode ? next.toggleMode() : next;
  }

  jumpToPreviousHunk() {
    const next = this.selectPreviousHunk();
    return next.getMode() !== this.mode ? next.toggleMode() : next;
  }

  selectNextHunk(preserveTail) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectNextItem(preserveTail);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  selectPreviousHunk(preserveTail) {
    const hunksSelection = this.hunksSelection.copy();
    hunksSelection.selectPreviousItem(preserveTail);

    return this.copy({mode: 'hunk', hunksSelection});
  }

  getSelectedHunks() {
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
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectItem(line, preserveTail);
    return this.copy({mode: 'line', linesSelection});
  }

  addOrSubtractLineSelection(line) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.addOrSubtractSelection(line);
    return this.copy({mode: 'line', linesSelection});
  }

  selectAllLines(preserveTail) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectAllItems(preserveTail);
    return this.copy({mode: 'line', linesSelection});
  }

  selectFirstLine(preserveTail) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectFirstItem(preserveTail);
    return this.copy({mode: 'line', linesSelection});
  }

  selectLastLine(preserveTail) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectLastItem(preserveTail);
    return this.copy({mode: 'line', linesSelection});
  }

  selectNextLine(preserveTail = false) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectNextItem(preserveTail);
    return this.copy({mode: 'line', linesSelection});
  }

  selectPreviousLine(preserveTail = false) {
    const linesSelection = this.linesSelection.copy();
    linesSelection.selectPreviousItem(preserveTail);
    return this.copy({mode: 'line', linesSelection});
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
    return this.copy({hunks: newHunks});
  }

  coalesce() {
    const hunksSelection = this.hunksSelection.copy();
    const linesSelection = this.linesSelection.copy();

    hunksSelection.coalesce();
    linesSelection.coalesce();

    return this.copy({hunksSelection, linesSelection});
  }

  getNextUpdatePromise() {
    return new Promise((resolve, reject) => {
      this.resolveNextUpdatePromise = resolve;
    });
  }

  getLineSelectionTailIndex() {
    return this.linesSelection.getTailIndex();
  }

  goToDiffLine(lineNumber) {
    const lines = this.linesSelection.getItems();

    let closestLine;
    let closestLineDistance = Infinity;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!this.linesSelection.isItemSelectable(line)) { continue; }
      if (line.newLineNumber === lineNumber) {
        return this.selectLine(line);
      } else {
        const newDistance = Math.abs(line.newLineNumber - lineNumber);
        if (newDistance < closestLineDistance) {
          closestLineDistance = newDistance;
          closestLine = line;
        } else {
          return this.selectLine(closestLine);
        }
      }
    }

    return this.selectLine(closestLine);
  }
}
