import {Range} from 'atom';
import {RBTree} from 'bintrees';

import PatchBuffer from './patch-buffer';
import {TOO_LARGE, COLLAPSED} from './patch';

export default class MultiFilePatch {
  static createNull() {
    return new this({patchBuffer: new PatchBuffer(), filePatches: []});
  }

  constructor({patchBuffer, filePatches}) {
    this.patchBuffer = patchBuffer;
    this.filePatches = filePatches || [];

    this.filePatchesByMarker = new Map();
    this.filePatchesByPath = new Map();
    this.hunksByMarker = new Map();

    // Store a map of {diffRow, offset} for each FilePatch where offset is the number of Hunk headers within the current
    // FilePatch that occur before this row in the original diff output.
    this.diffRowOffsetIndices = new Map();

    for (const filePatch of this.filePatches) {
      this.filePatchesByPath.set(filePatch.getPath(), filePatch);
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);

      let diffRow = 1;
      const index = new RBTree((a, b) => a.diffRow - b.diffRow);
      this.diffRowOffsetIndices.set(filePatch.getPath(), {startBufferRow: filePatch.getStartRange().start.row, index});

      for (let hunkIndex = 0; hunkIndex < filePatch.getHunks().length; hunkIndex++) {
        const hunk = filePatch.getHunks()[hunkIndex];
        this.hunksByMarker.set(hunk.getMarker(), hunk);

        // Advance past the hunk body
        diffRow += hunk.bufferRowCount();
        index.insert({diffRow, offset: hunkIndex + 1});

        // Advance past the next hunk header
        diffRow++;
      }
    }
  }

  clone(opts = {}) {
    return new this.constructor({
      patchBuffer: opts.patchBuffer !== undefined ? opts.patchBuffer : this.getLayeredBuffer(),
      filePatches: opts.filePatches !== undefined ? opts.filePatches : this.getFilePatches(),
    });
  }

  getLayeredBuffer() {
    return this.patchBuffer;
  }

  getBuffer() {
    return this.getLayeredBuffer().getBuffer();
  }

  getPatchLayer() {
    return this.getLayeredBuffer().getLayer('patch');
  }

  getHunkLayer() {
    return this.getLayeredBuffer().getLayer('hunk');
  }

  getUnchangedLayer() {
    return this.getLayeredBuffer().getLayer('unchanged');
  }

  getAdditionLayer() {
    return this.getLayeredBuffer().getLayer('addition');
  }

  getDeletionLayer() {
    return this.getLayeredBuffer().getLayer('deletion');
  }

  getNoNewlineLayer() {
    return this.getLayeredBuffer().getLayer('nonewline');
  }

  getFilePatches() {
    return this.filePatches;
  }

  getPathSet() {
    return this.getFilePatches().reduce((pathSet, filePatch) => {
      for (const file of [filePatch.getOldFile(), filePatch.getNewFile()]) {
        if (file.isPresent()) {
          pathSet.add(file.getPath());
        }
      }
      return pathSet;
    }, new Set());
  }

  getFilePatchAt(bufferRow) {
    if (bufferRow < 0 || bufferRow > this.patchBuffer.getBuffer().getLastRow()) {
      return undefined;
    }
    const [marker] = this.patchBuffer.findMarkers('patch', {intersectsRow: bufferRow});
    return this.filePatchesByMarker.get(marker);
  }

  getHunkAt(bufferRow) {
    if (bufferRow < 0) {
      return undefined;
    }
    const [marker] = this.patchBuffer.findMarkers('hunk', {intersectsRow: bufferRow});
    return this.hunksByMarker.get(marker);
  }

  getStagePatchForLines(selectedLineSet) {
    const nextPatchBuffer = new PatchBuffer();
    const nextFilePatches = this.getFilePatchesContaining(selectedLineSet).map(fp => {
      return fp.buildStagePatchForLines(this.getBuffer(), nextPatchBuffer, selectedLineSet);
    });
    return this.clone({patchBuffer: nextPatchBuffer, filePatches: nextFilePatches});
  }

  getStagePatchForHunk(hunk) {
    return this.getStagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getUnstagePatchForLines(selectedLineSet) {
    const nextPatchBuffer = new PatchBuffer();
    const nextFilePatches = this.getFilePatchesContaining(selectedLineSet).map(fp => {
      return fp.buildUnstagePatchForLines(this.getBuffer(), nextPatchBuffer, selectedLineSet);
    });
    return this.clone({patchBuffer: nextPatchBuffer, filePatches: nextFilePatches});
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getMaxSelectionIndex(selectedRows) {
    if (selectedRows.size === 0) {
      const [firstPatch] = this.getFilePatches();
      if (!firstPatch) {
        return Range.fromObject([[0, 0], [0, 0]]);
      }

      return firstPatch.getFirstChangeRange();
    }

    const lastMax = Math.max(...selectedRows);

    let selectionIndex = 0;
    // counts unselected lines in changed regions from the old patch
    // until we get to the bottom-most selected line from the old patch (lastMax).
    patchLoop: for (const filePatch of this.getFilePatches()) {
      for (const hunk of filePatch.getHunks()) {
        let includesMax = false;

        for (const change of hunk.getChanges()) {
          for (const {intersection, gap} of change.intersectRows(selectedRows, true)) {
            // Only include a partial range if this intersection includes the last selected buffer row.
            includesMax = intersection.intersectsRow(lastMax);
            const delta = includesMax ? lastMax - intersection.start.row + 1 : intersection.getRowCount();

            if (gap) {
              // Range of unselected changes.
              selectionIndex += delta;
            }

            if (includesMax) {
              break patchLoop;
            }
          }
        }
      }
    }

    return selectionIndex;
  }

  getSelectionRangeForIndex(selectionIndex) {
    // Iterate over changed lines in this patch in order to find the
    // new row to be selected based on the last selection index.
    // As we walk through the changed lines, we whittle down the
    // remaining lines until we reach the row that corresponds to the
    // last selected index.

    let selectionRow = 0;
    let remainingChangedLines = selectionIndex;

    let foundRow = false;
    let lastChangedRow;

    patchLoop: for (const filePatch of this.getFilePatches()) {
      for (const hunk of filePatch.getHunks()) {
        for (const change of hunk.getChanges()) {
          if (remainingChangedLines < change.bufferRowCount()) {
            selectionRow = change.getStartBufferRow() + remainingChangedLines;
            foundRow = true;
            break patchLoop;
          } else {
            remainingChangedLines -= change.bufferRowCount();
            lastChangedRow = change.getEndBufferRow();
          }
        }
      }
    }

    // If we never got to the last selected index, that means it is
    // no longer present in the new patch (ie. we staged the last line of the file).
    // In this case we want the next selected line to be the last changed row in the file
    if (!foundRow) {
      selectionRow = lastChangedRow;
    }

    return Range.fromObject([[selectionRow, 0], [selectionRow, Infinity]]);
  }

  adoptBuffer(nextPatchBuffer) {
    nextPatchBuffer.clearAllLayers();

    this.filePatchesByMarker.clear();
    this.hunksByMarker.clear();

    const markerMap = nextPatchBuffer.adopt(this.patchBuffer);

    for (const filePatch of this.getFilePatches()) {
      filePatch.updateMarkers(markerMap);
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);

      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }

    this.patchBuffer = nextPatchBuffer;
  }

  /*
   * Efficiently locate the FilePatch instances that contain at least one row from a Set.
   */
  getFilePatchesContaining(rowSet) {
    const sortedRowSet = Array.from(rowSet);
    sortedRowSet.sort((a, b) => a - b);

    const filePatches = [];
    let lastFilePatch = null;
    for (const row of sortedRowSet) {
      // Because the rows are sorted, consecutive rows will almost certainly belong to the same patch, so we can save
      // many avoidable marker index lookups by comparing with the last.
      if (lastFilePatch && lastFilePatch.containsRow(row)) {
        continue;
      }

      lastFilePatch = this.getFilePatchAt(row);
      filePatches.push(lastFilePatch);
    }

    return filePatches;
  }

  anyPresent() {
    return this.patchBuffer !== null && this.filePatches.some(fp => fp.isPresent());
  }

  didAnyChangeExecutableMode() {
    for (const filePatch of this.getFilePatches()) {
      if (filePatch.didChangeExecutableMode()) {
        return true;
      }
    }
    return false;
  }

  anyHaveTypechange() {
    return this.getFilePatches().some(fp => fp.hasTypechange());
  }

  getMaxLineNumberWidth() {
    return this.getFilePatches().reduce((maxWidth, filePatch) => {
      const width = filePatch.getMaxLineNumberWidth();
      return maxWidth >= width ? maxWidth : width;
    }, 0);
  }

  spansMultipleFiles(rows) {
    let lastFilePatch = null;
    for (const row of rows) {
      if (lastFilePatch) {
        if (lastFilePatch.containsRow(row)) {
          continue;
        }

        return true;
      } else {
        lastFilePatch = this.getFilePatchAt(row);
      }
    }
    return false;
  }

  collapseFilePatch(filePatch) {
    this.filePatchesByMarker.delete(filePatch.getMarker());
    for (const hunk of filePatch.getHunks()) {
      this.hunksByMarker.delete(hunk.getMarker());
    }

    filePatch.triggerCollapseIn(this.patchBuffer);

    this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
    // This hunk collection should be empty, but let's iterate anyway just in case filePatch was already collapsed
    for (const hunk of filePatch.getHunks()) {
      this.hunksByMarker.set(hunk.getMarker(), hunk);
    }
  }

  expandFilePatch(filePatch) {
    const index = this.filePatches.indexOf(filePatch);

    this.filePatchesByMarker.delete(filePatch.getMarker());
    for (const hunk of filePatch.getHunks()) {
      this.hunksByMarker.delete(hunk.getMarker());
    }

    const before = [];
    let beforeIndex = index - 1;
    while (beforeIndex >= 0) {
      const beforeFilePatch = this.filePatches[beforeIndex];
      before.push(...beforeFilePatch.getEndingMarkers());

      if (!beforeFilePatch.getMarker().getRange().isEmpty()) {
        break;
      }
      beforeIndex--;
    }

    const after = [];
    let afterIndex = index + 1;
    while (afterIndex < this.filePatches.length) {
      const afterFilePatch = this.filePatches[afterIndex];
      after.push(...afterFilePatch.getStartingMarkers());

      if (!afterFilePatch.getMarker().getRange().isEmpty()) {
        break;
      }
      afterIndex++;
    }

    filePatch.triggerExpandIn(this.patchBuffer, {before, after});

    this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
    for (const hunk of filePatch.getHunks()) {
      this.hunksByMarker.set(hunk.getMarker(), hunk);
    }
  }

  isPatchVisible = filePatchPath => {
    const patch = this.filePatchesByPath.get(filePatchPath);
    if (!patch) {
      return false;
    }
    return patch.getRenderStatus().isVisible();
  }

  getBufferRowForDiffPosition = (fileName, diffRow) => {
    const {startBufferRow, index} = this.diffRowOffsetIndices.get(fileName);
    const {offset} = index.lowerBound({diffRow}).data();
    return startBufferRow + diffRow - offset;
  }

  /*
   * Construct an apply-able patch String.
   */
  toString() {
    return this.filePatches.map(fp => fp.toStringIn(this.getBuffer())).join('') + '\n';
  }

  /*
   * Construct a string of diagnostic information useful for debugging.
   */
  inspect() {
    let inspectString = '(MultiFilePatch';
    inspectString += ` filePatchesByMarker=(${Array.from(this.filePatchesByMarker.keys(), m => m.id).join(', ')})`;
    inspectString += ` hunksByMarker=(${Array.from(this.hunksByMarker.keys(), m => m.id).join(', ')})\n`;
    for (const filePatch of this.filePatches) {
      inspectString += filePatch.inspect({indent: 2});
    }
    inspectString += ')\n';
    return inspectString;
  }

  isEqual(other) {
    return this.toString() === other.toString();
  }
}
