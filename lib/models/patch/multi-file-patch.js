import {TextBuffer, Range} from 'atom';

export default class MultiFilePatch {
  constructor({buffer, layers, filePatches}) {
    this.buffer = buffer || null;

    this.patchLayer = layers && layers.patch;
    this.hunkLayer = layers && layers.hunk;
    this.unchangedLayer = layers && layers.unchanged;
    this.additionLayer = layers && layers.addition;
    this.deletionLayer = layers && layers.deletion;
    this.noNewlineLayer = layers && layers.noNewline;

    this.filePatches = filePatches || [];

    this.filePatchesByMarker = new Map();
    this.hunksByMarker = new Map();

    for (const filePatch of this.filePatches) {
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }
  }

  clone(opts = {}) {
    return new this.constructor({
      buffer: opts.buffer !== undefined ? opts.buffer : this.getBuffer(),
      layers: opts.layers !== undefined ? opts.layers : {
        patch: this.getPatchLayer(),
        hunk: this.getHunkLayer(),
        unchanged: this.getUnchangedLayer(),
        addition: this.getAdditionLayer(),
        deletion: this.getDeletionLayer(),
        noNewline: this.getNoNewlineLayer(),
      },
      filePatches: opts.filePatches !== undefined ? opts.filePatches : this.getFilePatches(),
    });
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
    const [marker] = this.patchLayer.findMarkers({intersectsRow: bufferRow});
    return this.filePatchesByMarker.get(marker);
  }

  getHunkAt(bufferRow) {
    const [marker] = this.hunkLayer.findMarkers({intersectsRow: bufferRow});
    return this.hunksByMarker.get(marker);
  }

  getStagePatchForLines(selectedLineSet) {
    const nextLayeredBuffer = this.buildLayeredBuffer();
    const nextFilePatches = this.getFilePatchesContaining(selectedLineSet).map(fp => {
      return fp.buildStagePatchForLines(this.getBuffer(), nextLayeredBuffer, selectedLineSet);
    });
    return this.clone({...nextLayeredBuffer, filePatches: nextFilePatches});
  }

  getStagePatchForHunk(hunk) {
    return this.getStagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getUnstagePatchForLines(selectedLineSet) {
    const nextLayeredBuffer = this.buildLayeredBuffer();
    const nextFilePatches = this.getFilePatchesContaining(selectedLineSet).map(fp => {
      return fp.buildUnstagePatchForLines(this.getBuffer(), nextLayeredBuffer, selectedLineSet);
    });
    return this.clone({...nextLayeredBuffer, filePatches: nextFilePatches});
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getNextSelectionRange(lastMultiFilePatch, lastSelectedRows) {
    if (lastSelectedRows.size === 0) {
      const [firstPatch] = this.getFilePatches();
      if (!firstPatch) {
        return Range.fromObject([[0, 0], [0, 0]]);
      }

      return firstPatch.getFirstChangeRange();
    }

    const lastMax = Math.max(...lastSelectedRows);

    let lastSelectionIndex = 0;
    patchLoop: for (const lastFilePatch of lastMultiFilePatch.getFilePatches()) {
      for (const hunk of lastFilePatch.getHunks()) {
        let includesMax = false;

        for (const change of hunk.getChanges()) {
          for (const {intersection, gap} of change.intersectRows(lastSelectedRows, true)) {
            // Only include a partial range if this intersection includes the last selected buffer row.
            includesMax = intersection.intersectsRow(lastMax);
            const delta = includesMax ? lastMax - intersection.start.row + 1 : intersection.getRowCount();

            if (gap) {
              // Range of unselected changes.
              lastSelectionIndex += delta;
            }

            if (includesMax) {
              break patchLoop;
            }
          }
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

    return Range.fromObject([[newSelectionRow, 0], [newSelectionRow, Infinity]]);
  }

  adoptBufferFrom(lastMultiFilePatch) {
    lastMultiFilePatch.getPatchLayer().clear();
    lastMultiFilePatch.getHunkLayer().clear();
    lastMultiFilePatch.getUnchangedLayer().clear();
    lastMultiFilePatch.getAdditionLayer().clear();
    lastMultiFilePatch.getDeletionLayer().clear();
    lastMultiFilePatch.getNoNewlineLayer().clear();

    this.filePatchesByMarker.clear();
    this.hunksByMarker.clear();

    const nextBuffer = lastMultiFilePatch.getBuffer();
    nextBuffer.setText(this.getBuffer().getText());

    for (const filePatch of this.getFilePatches()) {
      filePatch.getPatch().reMarkOn(lastMultiFilePatch.getPatchLayer());
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);

      for (const hunk of filePatch.getHunks()) {
        hunk.reMarkOn(lastMultiFilePatch.getHunkLayer());
        this.hunksByMarker.set(hunk.getMarker(), hunk);

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
    return this.buffer !== null && this.filePatches.some(fp => fp.isPresent());
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

  /*
   * Construct an apply-able patch String.
   */
  toString() {
    return this.filePatches.map(fp => fp.toStringIn(this.buffer)).join('');
  }
}
