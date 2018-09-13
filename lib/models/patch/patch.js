import {TextBuffer} from 'atom';

import Hunk from './hunk';
import {Unchanged, Addition, Deletion, NoNewline} from './region';

class BufferBuilder {
  constructor(original) {
    this.originalBuffer = original;
    this.buffer = new TextBuffer();
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
    if (this.hunkStartRowOffset !== 0 || this.offset !== 0) {
      finalRange = finalRange.translate([this.hunkStartOffset, 0], [this.offset, 0]);
    }
    this.hunkRange = finalRange;
  }

  latestHunkWasIncluded() {
    this.buffer.append(this.hunkBufferText, {normalizeLineEndings: false});

    const regions = this.hunkRegions.map(({RegionKind, range}) => {
      return new RegionKind(this.buffer.markRange(range, {invalidate: 'never', exclusive: false}));
    });

    const marker = this.buffer.markRange(this.hunkRange, {invalidate: 'never', exclusive: false});

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
}

export default class Patch {
  constructor({status, hunks, buffer}) {
    this.status = status;
    this.hunks = hunks;
    this.buffer = buffer;

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

  clone(opts = {}) {
    return new this.constructor({
      status: opts.status !== undefined ? opts.status : this.getStatus(),
      hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
      buffer: opts.buffer !== undefined ? opts.buffer : this.getBuffer(),
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
    return this.clone({hunks, status, buffer: builder.getBuffer()});
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

    return this.clone({hunks, status, buffer: builder.getBuffer()});
  }

  getFullUnstagedPatch() {
    let newRowDelta = 0;
    const buffer = new TextBuffer({text: this.buffer.getText()});
    const hunks = this.getHunks().map(hunk => {
      const regions = hunk.getRegions().map(region => region.invertIn(buffer));
      const newHunk = new Hunk({
        oldStartRow: hunk.getNewStartRow(),
        oldRowCount: hunk.getNewRowCount(),
        newStartRow: hunk.getNewStartRow() + newRowDelta,
        newRowCount: hunk.getOldRowCount(),
        marker: buffer.markRange(hunk.getRange()),
        regions,
      });
      newRowDelta += newHunk.getNewRowCount() - newHunk.getOldRowCount();
      return newHunk;
    });
    const status = this.getStatus() === 'added' ? 'deleted' : this.getStatus();
    return this.clone({hunks, status});
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

  toString() {
    return this.getHunks().reduce((str, hunk) => {
      str += hunk.toStringIn(this.getBuffer());
      return str;
    }, '');
  }

  isPresent() {
    return true;
  }
}

export const nullPatch = {
  getStatus() {
    return null;
  },

  getHunks() {
    return [];
  },

  getBuffer() {
    return new TextBuffer();
  },

  getByteSize() {
    return 0;
  },

  getChangedLineCount() {
    return 0;
  },

  clone(opts = {}) {
    if (opts.status === undefined && opts.hunks === undefined && opts.buffer === undefined) {
      return this;
    } else {
      return new Patch({
        status: opts.status !== undefined ? opts.status : this.getStatus(),
        hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
        buffer: opts.buffer !== undefined ? opts.buffer : this.getBuffer(),
      });
    }
  },

  getStagePatchForLines() {
    return this;
  },

  getUnstagePatchForLines() {
    return this;
  },

  getFullUnstagedPatch() {
    return this;
  },

  getFirstChangeRange() {
    return [[0, 0], [0, 0]];
  },

  getNextSelectionRange() {
    return [[0, 0], [0, 0]];
  },

  getMaxLineNumberWidth() {
    return 0;
  },

  toString() {
    return '';
  },

  isPresent() {
    return false;
  },
};
