import ListSelection from './list-selection';

const COPY = Symbol('Copy');

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
      this.linesSelection = new ListSelection({
        items: lines,
        isItemSelectable: line => line.isChanged(),
      });
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
    let hunksSelection = options.hunksSelection || this.hunksSelection;
    let linesSelection = options.linesSelection || this.linesSelection;

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
      hunksSelection = hunksSelection.setItems(newHunks);

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

      linesSelection = linesSelection.setItems(newLines);
      if (newSelectedLine) {
        linesSelection = linesSelection.selectItem(newSelectedLine);
      }
      if (wasChanged) {
        this.resolveNextUpdatePromise();
      }
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
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectItem(hunk, preserveTail),
    });
  }

  addOrSubtractHunkSelection(hunk) {
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.addOrSubtractSelection(hunk),
    });
  }

  selectAllHunks() {
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectAllItems(),
    });
  }

  selectFirstHunk(preserveTail) {
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectFirstItem(preserveTail),
    });
  }

  selectLastHunk(preserveTail) {
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectLastItem(preserveTail),
    });
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
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectNextItem(preserveTail),
    });
  }

  selectPreviousHunk(preserveTail) {
    return this.copy({
      mode: 'hunk',
      hunksSelection: this.hunksSelection.selectPreviousItem(preserveTail),
    });
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

  isEmpty() {
    return this.hunksSelection.getItems().length === 0;
  }

  getHeadHunk() {
    return this.mode === 'hunk' ? this.hunksSelection.getHeadItem() : null;
  }

  selectLine(line, preserveTail = false) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectItem(line, preserveTail),
    });
  }

  addOrSubtractLineSelection(line) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.addOrSubtractSelection(line),
    });
  }

  selectAllLines(preserveTail) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectAllItems(preserveTail),
    });
  }

  selectFirstLine(preserveTail) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectFirstItem(preserveTail),
    });
  }

  selectLastLine(preserveTail) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectLastItem(preserveTail),
    });
  }

  selectNextLine(preserveTail = false) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectNextItem(preserveTail),
    });
  }

  selectPreviousLine(preserveTail = false) {
    return this.copy({
      mode: 'line',
      linesSelection: this.linesSelection.selectPreviousItem(preserveTail),
    });
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
    return this.copy({
      hunksSelection: this.hunksSelection.coalesce(),
      linesSelection: this.linesSelection.coalesce(),
    });
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
