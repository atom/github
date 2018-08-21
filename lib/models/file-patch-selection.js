import ListSelection from './list-selection';

const COPY = Symbol('Copy');

export default class FilePatchSelection {
  constructor(hunks) {
    if (hunks._copy !== COPY) {
      // Initialize a new selection
      this.mode = 'hunk';

      this.hunksByLine = new Map();
      this.changedLines = new Set();

      const lines = [];
      for (const hunk of hunks) {
        for (const region of hunk.getRegions()) {
          for (const line of region.getBufferRows()) {
            lines.push(line);
            this.hunksByLine.set(line, hunk);
            if (region.isChange()) {
              this.changedLines.add(line);
            }
          }
        }
      }

      this.hunksSelection = new ListSelection({items: hunks});
      this.linesSelection = new ListSelection({items: lines, isItemSelectable: line => this.changedLines.has(line)});
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
      this.changedLines = options.changedLines;
    }
  }

  copy(options = {}) {
    const mode = options.mode || this.mode;
    let hunksSelection = options.hunksSelection || this.hunksSelection;
    let linesSelection = options.linesSelection || this.linesSelection;

    let hunksByLine = null;
    let changedLines = null;
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
      changedLines = new Set();
      for (const hunk of newHunks) {
        for (const region of hunk.getRegions()) {
          for (const line of region.getBufferRows()) {
            newLines.push(line);
            hunksByLine.set(line, hunk);
            if (region.isChange()) {
              changedLines.add(line);
            }
          }
        }
      }

      // Update lines, preserving selection index in *changed* lines
      let newSelectedLine;
      if (oldLines.length > 0 && newLines.length > 0) {
        const oldSelectionStartIndex = this.linesSelection.getMostRecentSelectionStartIndex();
        let changedLineCount = 0;
        for (let i = 0; i < oldSelectionStartIndex; i++) {
          if (this.changedLines.has(oldLines[i])) {
            changedLineCount++;
          }
        }

        for (let i = 0; i < newLines.length; i++) {
          const line = newLines[i];
          if (changedLines.has(line)) {
            newSelectedLine = line;
            if (changedLineCount === 0) {
              break;
            }
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
      // Hunks are unchanged. Don't recompute hunksByLine or changedLines.
      hunksByLine = this.hunksByLine;
      changedLines = this.changedLines;
    }

    return new FilePatchSelection({
      _copy: COPY,
      mode,
      hunksSelection,
      linesSelection,
      hunksByLine,
      changedLines,
      resolveNextUpdatePromise: options.resolveNextUpdatePromise || this.resolveNextUpdatePromise,
    });
  }

  toggleMode() {
    if (this.mode === 'hunk') {
      const firstLineOfSelectedHunk = this.getHeadHunk().getBufferRange().start.row;
      const selection = this.selectLine(firstLineOfSelectedHunk);
      if (!this.changedLines.has(firstLineOfSelectedHunk)) {
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
      for (const line of this.getSelectedLines()) {
        selectedHunks.add(this.hunksByLine.get(line));
      }
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
      for (const hunk of this.getSelectedHunks()) {
        for (const change of hunk.getChanges()) {
          for (const line of change.getBufferRows()) {
            selectedLines.add(line);
          }
        }
      }
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
    // console.log(`<<< finding closest line to ${lineNumber}`);
    const lines = this.linesSelection.getItems();

    let closestLine;
    let closestLineDistance = Infinity;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // console.log(`considering line = ${line}`);
      if (!this.linesSelection.isItemSelectable(line)) {
        // console.log('... not selectable');
        continue;
      }

      const hunk = this.hunksByLine.get(line);
      const newLineNumber = hunk.getNewRowAt(line);
      if (newLineNumber === null) {
        // console.log('... deleted line');
        continue;
      }

      // console.log(`  new line number = ${newLineNumber}`);

      if (newLineNumber === lineNumber) {
        // console.log('>>> exact match');
        return this.selectLine(line);
      } else {
        const newDistance = Math.abs(newLineNumber - lineNumber);
        // console.log(`  distance = ${newDistance} vs. closest = ${closestLineDistance}`);
        if (newDistance < closestLineDistance) {
          closestLineDistance = newDistance;
          closestLine = line;
          // console.log(`  new closest line = ${closestLine}`);
        } else {
          // console.log(`>>> increasing distance. choosing previous closest line = ${closestLine}`);
          return this.selectLine(closestLine);
        }
      }
    }

    // console.log(`>>> choosing closest line = ${closestLine}`);
    return this.selectLine(closestLine);
  }
}
