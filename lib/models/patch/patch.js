import {TextBuffer} from 'atom';

import Hunk from './hunk';
import {Unchanged, Addition, Deletion, NoNewline} from './region';

export default class Patch {
  static createNull() {
    return new NullPatch();
  }

  constructor({status, hunks, buffer, layers}) {
    this.status = status;
    this.hunks = hunks;
    this.buffer = buffer;

    this.hunkLayer = layers.hunk;
    this.unchangedLayer = layers.unchanged;
    this.additionLayer = layers.addition;
    this.deletionLayer = layers.deletion;
    this.noNewlineLayer = layers.noNewline;

    this.buffer.retain();
    this.hunksByMarker = new Map(this.getHunks().map(hunk => [hunk.getMarker(), hunk]));
    this.changedLineCount = this.getHunks().reduce((acc, hunk) => acc + hunk.changedLineCount(), 0);
  }

  getStatus() {
    return this.status;
  }

  getHunks() {
    return this.hunks;
  }

  getBuffer() {
    return this.buffer;
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

  getByteSize() {
    return Buffer.byteLength(this.buffer.getText(), 'utf8');
  }

  getChangedLineCount() {
    return this.changedLineCount;
  }

  getMaxLineNumberWidth() {
    const lastHunk = this.hunks[this.hunks.length - 1];
    return lastHunk ? lastHunk.getMaxLineNumberWidth() : 0;
  }

  getHunkAt(bufferRow) {
    const [marker] = this.hunkLayer.findMarkers({intersectsRow: bufferRow});
    return this.hunksByMarker.get(marker);
  }

  clone(opts = {}) {
    return new this.constructor({
      status: opts.status !== undefined ? opts.status : this.getStatus(),
      hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
      buffer: opts.buffer !== undefined ? opts.buffer : this.getBuffer(),
      layers: opts.layers !== undefined ? opts.layers : {
        hunk: this.getHunkLayer(),
        unchanged: this.getUnchangedLayer(),
        addition: this.getAdditionLayer(),
        deletion: this.getDeletionLayer(),
        noNewline: this.getNoNewlineLayer(),
      },
    });
  }

  getStagePatchForLines(rowSet) {
    const builder = new BufferBuilder(this.getBuffer());
    const hunks = [];

    let newRowDelta = 0;

    for (const hunk of this.getHunks()) {
      let atLeastOneSelectedChange = false;
      let selectedDeletionRowCount = 0;
      let noNewlineRowCount = 0;

      for (const region of hunk.getRegions()) {
        for (const {intersection, gap} of region.intersectRows(rowSet, true)) {
          region.when({
            addition: () => {
              if (gap) {
                // Unselected addition: omit from new buffer
                builder.remove(intersection);
              } else {
                // Selected addition: include in new patch
                atLeastOneSelectedChange = true;
                builder.append(intersection);
                builder.markRegion(intersection, Addition);
              }
            },
            deletion: () => {
              if (gap) {
                // Unselected deletion: convert to context row
                builder.append(intersection);
                builder.markRegion(intersection, Unchanged);
              } else {
                // Selected deletion: include in new patch
                atLeastOneSelectedChange = true;
                builder.append(intersection);
                builder.markRegion(intersection, Deletion);
                selectedDeletionRowCount += intersection.getRowCount();
              }
            },
            unchanged: () => {
              // Untouched context line: include in new patch
              builder.append(intersection);
              builder.markRegion(intersection, Unchanged);
            },
            nonewline: () => {
              builder.append(intersection);
              builder.markRegion(intersection, NoNewline);
              noNewlineRowCount += intersection.getRowCount();
            },
          });
        }
      }

      if (atLeastOneSelectedChange) {
        // Hunk contains at least one selected line

        builder.markHunkRange(hunk.getRange());
        const {regions, marker} = builder.latestHunkWasIncluded();
        const newStartRow = hunk.getNewStartRow() + newRowDelta;
        const newRowCount = marker.getRange().getRowCount() - selectedDeletionRowCount - noNewlineRowCount;

        hunks.push(new Hunk({
          oldStartRow: hunk.getOldStartRow(),
          oldRowCount: hunk.getOldRowCount(),
          newStartRow,
          newRowCount,
          sectionHeading: hunk.getSectionHeading(),
          marker,
          regions,
        }));

        newRowDelta += newRowCount - hunk.getNewRowCount();
      } else {
        newRowDelta += hunk.getOldRowCount() - hunk.getNewRowCount();

        builder.latestHunkWasDiscarded();
      }
    }

    const wholeFile = rowSet.size === this.changedLineCount;
    const status = this.getStatus() === 'deleted' && !wholeFile ? 'modified' : this.getStatus();
    return this.clone({hunks, status, buffer: builder.getBuffer(), layers: builder.getLayers()});
  }

  getUnstagePatchForLines(rowSet) {
    const builder = new BufferBuilder(this.getBuffer());
    const hunks = [];
    let newRowDelta = 0;

    for (const hunk of this.getHunks()) {
      let atLeastOneSelectedChange = false;
      let contextRowCount = 0;
      let additionRowCount = 0;
      let deletionRowCount = 0;

      for (const region of hunk.getRegions()) {
        for (const {intersection, gap} of region.intersectRows(rowSet, true)) {
          region.when({
            addition: () => {
              if (gap) {
                // Unselected addition: become a context line.
                builder.append(intersection);
                builder.markRegion(intersection, Unchanged);
                contextRowCount += intersection.getRowCount();
              } else {
                // Selected addition: become a deletion.
                atLeastOneSelectedChange = true;
                builder.append(intersection);
                builder.markRegion(intersection, Deletion);
                deletionRowCount += intersection.getRowCount();
              }
            },
            deletion: () => {
              if (gap) {
                // Non-selected deletion: omit from new buffer.
                builder.remove(intersection);
              } else {
                // Selected deletion: becomes an addition
                atLeastOneSelectedChange = true;
                builder.append(intersection);
                builder.markRegion(intersection, Addition);
                additionRowCount += intersection.getRowCount();
              }
            },
            unchanged: () => {
              // Untouched context line: include in new patch.
              builder.append(intersection);
              builder.markRegion(intersection, Unchanged);
              contextRowCount += intersection.getRowCount();
            },
            nonewline: () => {
              // Nonewline marker: include in new patch.
              builder.append(intersection);
              builder.markRegion(intersection, NoNewline);
            },
          });
        }
      }

      if (atLeastOneSelectedChange) {
        // Hunk contains at least one selected line

        builder.markHunkRange(hunk.getRange());
        const {marker, regions} = builder.latestHunkWasIncluded();
        hunks.push(new Hunk({
          oldStartRow: hunk.getNewStartRow(),
          oldRowCount: contextRowCount + deletionRowCount,
          newStartRow: hunk.getNewStartRow() + newRowDelta,
          newRowCount: contextRowCount + additionRowCount,
          sectionHeading: hunk.getSectionHeading(),
          marker,
          regions,
        }));
      } else {
        builder.latestHunkWasDiscarded();
      }

      // (contextRowCount + additionRowCount) - (contextRowCount + deletionRowCount)
      newRowDelta += additionRowCount - deletionRowCount;
    }

    const wholeFile = rowSet.size === this.changedLineCount;
    let status = this.getStatus();
    if (this.getStatus() === 'added') {
      status = wholeFile ? 'deleted' : 'modified';
    }

    return this.clone({hunks, status, buffer: builder.getBuffer(), layers: builder.getLayers()});
  }

  getFullUnstagedPatch() {
    let newRowDelta = 0;
    const buffer = new TextBuffer({text: this.buffer.getText()});
    const layers = {
      hunk: buffer.addMarkerLayer(),
      unchanged: buffer.addMarkerLayer(),
      addition: buffer.addMarkerLayer(),
      deletion: buffer.addMarkerLayer(),
      noNewline: buffer.addMarkerLayer(),
    };

    const hunks = this.getHunks().map(hunk => {
      const regions = hunk.getRegions().map(region => {
        const layer = region.when({
          unchanged: () => layers.unchanged,
          addition: () => layers.addition,
          deletion: () => layers.deletion,
          nonewline: () => layers.noNewline,
        });
        return region.invertIn(layer);
      });
      const newHunk = new Hunk({
        oldStartRow: hunk.getNewStartRow(),
        oldRowCount: hunk.getNewRowCount(),
        newStartRow: hunk.getNewStartRow() + newRowDelta,
        newRowCount: hunk.getOldRowCount(),
        marker: layers.hunk.markRange(hunk.getRange()),
        regions,
      });
      newRowDelta += newHunk.getNewRowCount() - newHunk.getOldRowCount();
      return newHunk;
    });
    const status = this.getStatus() === 'added' ? 'deleted' : this.getStatus();
    return this.clone({hunks, status, buffer, layers});
  }

  getFirstChangeRange() {
    const firstHunk = this.getHunks()[0];
    if (!firstHunk) {
      return [[0, 0], [0, 0]];
    }

    const firstChange = firstHunk.getChanges()[0];
    if (!firstChange) {
      return [[0, 0], [0, 0]];
    }

    const firstRow = firstChange.getStartBufferRow();
    return [[firstRow, 0], [firstRow, Infinity]];
  }

  getNextSelectionRange(lastPatch, lastSelectedRows) {
    if (lastSelectedRows.size === 0) {
      return this.getFirstChangeRange();
    }

    const lastMax = Math.max(...lastSelectedRows);

    let lastSelectionIndex = 0;
    for (const hunk of lastPatch.getHunks()) {
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

    let newSelectionRow = 0;
    hunkLoop: for (const hunk of this.getHunks()) {
      for (const change of hunk.getChanges()) {
        if (lastSelectionIndex < change.bufferRowCount()) {
          newSelectionRow = change.getStartBufferRow() + lastSelectionIndex;
          break hunkLoop;
        } else {
          lastSelectionIndex -= change.bufferRowCount();
        }
      }
    }

    return [[newSelectionRow, 0], [newSelectionRow, Infinity]];
  }

  adoptBufferFrom(lastPatch) {
    lastPatch.getHunkLayer().clear();
    lastPatch.getUnchangedLayer().clear();
    lastPatch.getAdditionLayer().clear();
    lastPatch.getDeletionLayer().clear();
    lastPatch.getNoNewlineLayer().clear();

    const nextBuffer = lastPatch.getBuffer();
    nextBuffer.setText(this.getBuffer().getText());

    for (const hunk of this.getHunks()) {
      hunk.reMarkOn(lastPatch.getHunkLayer());
      for (const region of hunk.getRegions()) {
        const target = region.when({
          unchanged: () => lastPatch.getUnchangedLayer(),
          addition: () => lastPatch.getAdditionLayer(),
          deletion: () => lastPatch.getDeletionLayer(),
          nonewline: () => lastPatch.getNoNewlineLayer(),
        });
        region.reMarkOn(target);
      }
    }

    this.hunkLayer = lastPatch.getHunkLayer();
    this.unchangedLayer = lastPatch.getUnchangedLayer();
    this.additionLayer = lastPatch.getAdditionLayer();
    this.deletionLayer = lastPatch.getDeletionLayer();
    this.noNewlineLayer = lastPatch.getNoNewlineLayer();

    this.getBuffer().release();
    this.buffer = nextBuffer;
    this.hunksByMarker = new Map(this.getHunks().map(hunk => [hunk.getMarker(), hunk]));
  }

  toString() {
    return this.getHunks().reduce((str, hunk) => {
      str += hunk.toStringIn(this.getBuffer());
      return str;
    }, '');
  }

  isPresent() {
    return true;
  }

  isEqual(other) {
    if (this === other) { return true; }

    if (!other.isPresent()) { return false; }
    if (this.status !== other.status) { return false; }
    if (this.changedLineCount !== other.changedLineCount) { return false; }

    if (this.hunks.length !== other.hunks.length) { return false; }
    if (this.hunks.some((hunk, i) => !hunk.isEqual(other.hunks[i]))) { return false; }
    if (this.buffer.getText() !== other.buffer.getText()) { return false; }

    return true;
  }
}

class NullPatch {
  constructor() {
    this.buffer = new TextBuffer();
    this.hunkLayer = this.buffer.addMarkerLayer();
    this.unchangedLayer = this.buffer.addMarkerLayer();
    this.additionLayer = this.buffer.addMarkerLayer();
    this.deletionLayer = this.buffer.addMarkerLayer();
    this.noNewlineLayer = this.buffer.addMarkerLayer();

    this.buffer.retain();
  }

  getStatus() {
    return null;
  }

  getHunks() {
    return [];
  }

  getBuffer() {
    return this.buffer;
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

  getByteSize() {
    return 0;
  }

  getChangedLineCount() {
    return 0;
  }

  clone(opts = {}) {
    if (
      opts.status === undefined &&
      opts.hunks === undefined &&
      opts.buffer === undefined &&
      opts.layers === undefined
    ) {
      return this;
    } else {
      return new Patch({
        status: opts.status !== undefined ? opts.status : this.getStatus(),
        hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
        buffer: opts.buffer !== undefined ? opts.buffer : this.getBuffer(),
        layers: opts.layers !== undefined ? opts.layers : {
          hunk: this.getHunkLayer(),
          unchanged: this.getUnchangedLayer(),
          addition: this.getAdditionLayer(),
          deletion: this.getDeletionLayer(),
          noNewline: this.getNoNewlineLayer(),
        },
      });
    }
  }

  getStagePatchForLines() {
    return this;
  }

  getUnstagePatchForLines() {
    return this;
  }

  getFullUnstagedPatch() {
    return this;
  }

  getFirstChangeRange() {
    return [[0, 0], [0, 0]];
  }

  getNextSelectionRange() {
    return [[0, 0], [0, 0]];
  }

  adoptBufferFrom(lastPatch) {
    lastPatch.getHunkLayer().clear();
    lastPatch.getUnchangedLayer().clear();
    lastPatch.getAdditionLayer().clear();
    lastPatch.getDeletionLayer().clear();
    lastPatch.getNoNewlineLayer().clear();

    const nextBuffer = lastPatch.getBuffer();
    nextBuffer.setText('');

    this.hunkLayer = lastPatch.getHunkLayer();
    this.unchangedLayer = lastPatch.getUnchangedLayer();
    this.additionLayer = lastPatch.getAdditionLayer();
    this.deletionLayer = lastPatch.getDeletionLayer();
    this.noNewlineLayer = lastPatch.getNoNewlineLayer();

    this.buffer.release();
    this.buffer = nextBuffer;
  }

  getMaxLineNumberWidth() {
    return 0;
  }

  getHunkAt(bufferRow) {
    return undefined;
  }

  toString() {
    return '';
  }

  isPresent() {
    return false;
  }

  isEqual(other) {
    return !other.isPresent();
  }
}

class BufferBuilder {
  constructor(original) {
    this.originalBuffer = original;
    this.buffer = new TextBuffer();
    this.buffer.retain();
    this.layers = new Map(
      [Unchanged, Addition, Deletion, NoNewline, 'hunk'].map(key => {
        return [key, this.buffer.addMarkerLayer()];
      }),
    );
    this.offset = 0;

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartOffset = 0;
    this.hunkRegions = [];
    this.hunkRange = null;

    this.lastOffset = 0;
  }

  append(range) {
    this.hunkBufferText += this.originalBuffer.getTextInRange(range) + '\n';
    this.hunkRowCount += range.getRowCount();
  }

  remove(range) {
    this.offset -= range.getRowCount();
  }

  markRegion(range, RegionKind) {
    const finalRange = this.offset !== 0
      ? range.translate([this.offset, 0], [this.offset, 0])
      : range;

    // Collapse consecutive ranges of the same RegionKind into one continuous region.
    const lastRegion = this.hunkRegions[this.hunkRegions.length - 1];
    if (lastRegion && lastRegion.RegionKind === RegionKind && finalRange.start.row - lastRegion.range.end.row === 1) {
      lastRegion.range.end = finalRange.end;
    } else {
      this.hunkRegions.push({RegionKind, range: finalRange});
    }
  }

  markHunkRange(range) {
    let finalRange = range;
    if (this.hunkStartOffset !== 0 || this.offset !== 0) {
      finalRange = finalRange.translate([this.hunkStartOffset, 0], [this.offset, 0]);
    }
    this.hunkRange = finalRange;
  }

  latestHunkWasIncluded() {
    this.buffer.append(this.hunkBufferText, {normalizeLineEndings: false});

    const regions = this.hunkRegions.map(({RegionKind, range}) => {
      return new RegionKind(
        this.layers.get(RegionKind).markRange(range, {invalidate: 'never', exclusive: false}),
      );
    });

    const marker = this.layers.get('hunk').markRange(this.hunkRange, {invalidate: 'never', exclusive: false});

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartOffset = this.offset;
    this.hunkRegions = [];
    this.hunkRange = null;

    return {regions, marker};
  }

  latestHunkWasDiscarded() {
    this.offset -= this.hunkRowCount;

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartOffset = this.offset;
    this.hunkRegions = [];
    this.hunkRange = null;

    return {regions: [], marker: null};
  }

  getBuffer() {
    return this.buffer;
  }

  getLayers() {
    return {
      hunk: this.layers.get('hunk'),
      unchanged: this.layers.get(Unchanged),
      addition: this.layers.get(Addition),
      deletion: this.layers.get(Deletion),
      noNewline: this.layers.get(NoNewline),
    };
  }
}
