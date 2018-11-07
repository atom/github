import {TextBuffer} from 'atom';

export default class MultiFilePatch {
  constructor(buffer = null, layers = {}, filePatches = []) {
    this.buffer = buffer;

    this.patchLayer = layers.patch;
    this.hunkLayer = layers.hunk;
    this.unchangedLayer = layers.unchanged;
    this.additionLayer = layers.addition;
    this.deletionLayer = layers.deletion;
    this.noNewlineLayer = layers.noNewline;

    this.filePatches = filePatches;

    this.filePatchesByMarker = new Map();
    this.hunksByMarker = new Map();

    for (const filePatch of this.filePatches) {
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }
  }

  getBuffer() {
    return this.buffer;
  }

  getPatchLayer() {
    return this.patchLayer;
  }

  getHunkLayer() {
    return this.hunkLayer;
  }

  getUnchangedLayer() {
    return this.unchangedLayer;
  }

  getAdditionLayer() {
    return this.additionLayer;
  }

  getDeletionLayer() {
    return this.deletionLayer;
  }

  getNoNewlineLayer() {
    return this.noNewlineLayer;
  }

  getFilePatches() {
    return this.filePatches;
  }

  getFilePatchAt(bufferRow) {
    const [marker] = this.patchLayer.findMarkers({intersectsRow: bufferRow});
    return this.filePatchesByMarker.get(marker);
  }

  getHunkAt(bufferRow) {
    const [marker] = this.hunkLayer.findMarkers({intersectsRow: bufferRow});
    return this.hunksByMarker.get(marker);
  }

  getStagePatchForLines(selectedLineSet) {
    const nextLayeredBuffer = this.buildLayeredBuffer();
    const nextFilePatches = Array.from(this.getFilePatchesContaining(selectedLineSet), fp => {
      return fp.buildStagePatchForLines(this.getBuffer(), nextLayeredBuffer, selectedLineSet);
    });

    return new MultiFilePatch(
      nextLayeredBuffer.buffer,
      nextLayeredBuffer.layers,
      nextFilePatches,
    );
  }

  getStagePatchForHunk(hunk) {
    return this.getStagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getUnstagePatchForLines(selectedLineSet) {
    const nextLayeredBuffer = this.buildLayeredBuffer();
    const nextFilePatches = Array.from(this.getFilePatchesContaining(selectedLineSet), fp => {
      return fp.buildUnstagePatchForLines(this.getBuffer(), nextLayeredBuffer, selectedLineSet);
    });

    return new MultiFilePatch(
      nextLayeredBuffer.buffer,
      nextLayeredBuffer.layers,
      nextFilePatches,
    );
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getNextSelectionRange(lastMultiFilePatch, lastSelectedRows) {
    if (lastSelectedRows.size === 0) {
      const [firstPatch] = this.getFilePatches();
      if (!firstPatch) {
        return [[0, 0], [0, 0]];
      }

      return firstPatch.getFirstChangeRange();
    }

    const lastMax = Math.max(...lastSelectedRows);

    let lastSelectionIndex = 0;
    for (const lastFilePatch of lastMultiFilePatch.getFilePatches()) {
      for (const hunk of lastFilePatch.getHunks()) {
        let includesMax = false;
        let hunkSelectionOffset = 0;

        changeLoop: for (const change of hunk.getChanges()) {
          for (const {intersection, gap} of change.intersectRows(lastSelectedRows, true)) {
          // Only include a partial range if this intersection includes the last selected buffer row.
            includesMax = intersection.intersectsRow(lastMax);
            const delta = includesMax ? lastMax - intersection.start.row + 1 : intersection.getRowCount();

            if (gap) {
            // Range of unselected changes.
              hunkSelectionOffset += delta;
            }

            if (includesMax) {
              break changeLoop;
            }
          }
        }

        lastSelectionIndex += hunkSelectionOffset;

        if (includesMax) {
          break;
        }
      }
    }

    let newSelectionRow = 0;
    patchLoop: for (const filePatch of this.getFilePatches()) {
      for (const hunk of filePatch.getHunks()) {
        for (const change of hunk.getChanges()) {
          if (lastSelectionIndex < change.bufferRowCount()) {
            newSelectionRow = change.getStartBufferRow() + lastSelectionIndex;
            break patchLoop;
          } else {
            lastSelectionIndex -= change.bufferRowCount();
          }
        }
      }
    }

    return [[newSelectionRow, 0], [newSelectionRow, Infinity]];
  }

  adoptBufferFrom(lastMultiFilePatch) {
    lastMultiFilePatch.getHunkLayer().clear();
    lastMultiFilePatch.getUnchangedLayer().clear();
    lastMultiFilePatch.getAdditionLayer().clear();
    lastMultiFilePatch.getDeletionLayer().clear();
    lastMultiFilePatch.getNoNewlineLayer().clear();

    const nextBuffer = lastMultiFilePatch.getBuffer();
    nextBuffer.setText(this.getBuffer().getText());

    for (const patch of this.getFilePatches()) {
      for (const hunk of patch.getHunks()) {
        hunk.reMarkOn(lastMultiFilePatch.getHunkLayer());
        for (const region of hunk.getRegions()) {
          const target = region.when({
            unchanged: () => lastMultiFilePatch.getUnchangedLayer(),
            addition: () => lastMultiFilePatch.getAdditionLayer(),
            deletion: () => lastMultiFilePatch.getDeletionLayer(),
            nonewline: () => lastMultiFilePatch.getNoNewlineLayer(),
          });
          region.reMarkOn(target);
        }
      }
    }

    this.filePatchesByMarker.clear();
    this.hunksByMarker.clear();

    for (const filePatch of this.filePatches) {
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }

    this.patchLayer = lastMultiFilePatch.getPatchLayer();
    this.hunkLayer = lastMultiFilePatch.getHunkLayer();
    this.unchangedLayer = lastMultiFilePatch.getUnchangedLayer();
    this.additionLayer = lastMultiFilePatch.getAdditionLayer();
    this.deletionLayer = lastMultiFilePatch.getDeletionLayer();
    this.noNewlineLayer = lastMultiFilePatch.getNoNewlineLayer();

    this.buffer = nextBuffer;
  }

  buildLayeredBuffer() {
    const buffer = new TextBuffer();
    buffer.retain();

    return {
      buffer,
      layers: {
        patch: buffer.addMarkerLayer(),
        hunk: buffer.addMarkerLayer(),
        unchanged: buffer.addMarkerLayer(),
        addition: buffer.addMarkerLayer(),
        deletion: buffer.addMarkerLayer(),
        noNewline: buffer.addMarkerLayer(),
      },
    };
  }

  /*
   * Efficiently locate the FilePatch instances that contain at least one row from a Set.
   */
  getFilePatchesContaining(rowSet) {
    const sortedRowSet = Array.from(rowSet);
    sortedRowSet.sort((a, b) => b - a);

    const filePatches = new Set();
    let lastFilePatch = null;
    for (const row in sortedRowSet) {
      // Because the rows are sorted, consecutive rows will almost certainly belong to the same patch, so we can save
      // many avoidable marker index lookups by comparing with the last.
      if (lastFilePatch && lastFilePatch.containsRow(row)) {
        continue;
      }

      lastFilePatch = this.getFilePatchAt(row);
      filePatches.add(lastFilePatch);
    }

    return filePatches;
  }

  anyPresent() {
    return this.buffer !== null;
  }

  didAnyChangeExecutableMode() {
    for (const filePatch of this.getFilePatches()) {
      if (filePatch.didChangeExecutableMode()) {
        return true;
      }
    }
    return false;
  }

  anyHaveSymlink() {
    for (const filePatch of this.getFilePatches()) {
      if (filePatch.hasSymlink()) {
        return true;
      }
    }
    return false;
  }

  getMaxLineNumberWidth() {
    return this.getFilePatches().reduce((maxWidth, filePatch) => {
      const width = filePatch.getMaxLineNumberWidth();
      return maxWidth >= width ? maxWidth : width;
    }, 0);
  }

  /*
   * Construct an apply-able patch String.
   */
  toString() {
    return this.filePatches.map(fp => fp.toStringIn(this.buffer)).join('');
  }
}
