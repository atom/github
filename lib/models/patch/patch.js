import Hunk from './hunk';
import {Addition, Deletion, NoNewline} from './region';

class BufferBuilder {
  constructor(original) {
    this.originalBufferText = original;
    this.bufferText = '';
    this.positionOffset = 0;
    this.rowOffset = 0;

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartPositionOffset = 0;
    this.hunkStartRowOffset = 0;

    this.lastOffset = 0;
  }

  append(rowRange) {
    this.hunkBufferText += this.originalBufferText.slice(rowRange.startOffset, rowRange.endOffset);
    this.hunkRowCount += rowRange.bufferRowCount();
  }

  remove(rowRange) {
    this.rowOffset -= rowRange.bufferRowCount();
    this.positionOffset -= rowRange.endOffset - rowRange.startOffset;
  }

  latestHunkWasIncluded() {
    this.bufferText += this.hunkBufferText;

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartPositionOffset = this.positionOffset;
    this.hunkStartRowOffset = this.rowOffset;
  }

  latestHunkWasDiscarded() {
    this.rowOffset -= this.hunkRowCount;
    this.positionOffset -= this.hunkBufferText.length;

    this.hunkBufferText = '';
    this.hunkRowCount = 0;
    this.hunkStartPositionOffset = this.positionOffset;
    this.hunkStartRowOffset = this.rowOffset;
  }

  applyOffsetTo(rowRange) {
    return rowRange.offsetBy(this.positionOffset, this.rowOffset);
  }

  applyHunkOffsetsTo(rowRange) {
    return rowRange.offsetBy(
      this.hunkStartPositionOffset, this.hunkStartRowOffset,
      this.positionOffset, this.rowOffset,
    );
  }

  getBufferText() {
    return this.bufferText;
  }
}

export default class Patch {
  constructor({status, hunks, bufferText}) {
    this.status = status;
    this.hunks = hunks;
    this.bufferText = bufferText;

    this.changedLineCount = this.getHunks().reduce((acc, hunk) => acc + hunk.changedLineCount(), 0);
  }

  getStatus() {
    return this.status;
  }

  getHunks() {
    return this.hunks;
  }

  getBufferText() {
    return this.bufferText;
  }

  getByteSize() {
    return Buffer.byteLength(this.bufferText, 'utf8');
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
      bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
    });
  }

  getStagePatchForLines(rowSet) {
    const builder = new BufferBuilder(this.getBufferText());
    const hunks = [];

    let newRowDelta = 0;

    for (const hunk of this.getHunks()) {
      const changes = [];
      let noNewlineChange = null;
      let selectedDeletionRowCount = 0;
      let noNewlineRowCount = 0;

      for (const region of hunk.getRegions()) {
        for (const {intersection, gap} of region.getRowRange().intersectRowsIn(rowSet, this.getBufferText(), true)) {
          region.when({
            addition: () => {
              if (gap) {
                // Unselected addition: omit from new buffer
                builder.remove(intersection);
              } else {
                // Selected addition: include in new patch
                builder.append(intersection);
                changes.push(new Addition(
                  builder.applyOffsetTo(intersection),
                ));
              }
            },
            deletion: () => {
              if (gap) {
                // Unselected deletion: convert to context row
                builder.append(intersection);
              } else {
                // Selected deletion: include in new patch
                builder.append(intersection);
                changes.push(new Deletion(
                  builder.applyOffsetTo(intersection),
                ));
                selectedDeletionRowCount += intersection.bufferRowCount();
              }
            },
            unchanged: () => {
              // Untouched context line: include in new patch
              builder.append(intersection);
            },
            nonewline: () => {
              builder.append(intersection);
              noNewlineChange = new NoNewline(
                builder.applyOffsetTo(intersection),
              );
              noNewlineRowCount += intersection.bufferRowCount();
            },
          });
        }
      }

      if (changes.length > 0) {
        // Hunk contains at least one selected line
        if (noNewlineChange !== null) {
          changes.push(noNewlineChange);
        }

        const rowRange = builder.applyHunkOffsetsTo(hunk.getRowRange());
        const newStartRow = hunk.getNewStartRow() + newRowDelta;
        const newRowCount = rowRange.bufferRowCount() - selectedDeletionRowCount - noNewlineRowCount;

        hunks.push(new Hunk({
          oldStartRow: hunk.getOldStartRow(),
          oldRowCount: hunk.getOldRowCount(),
          newStartRow,
          newRowCount,
          sectionHeading: hunk.getSectionHeading(),
          rowRange,
          changes,
        }));

        newRowDelta += newRowCount - hunk.getNewRowCount();

        builder.latestHunkWasIncluded();
      } else {
        newRowDelta += hunk.getOldRowCount() - hunk.getNewRowCount();

        builder.latestHunkWasDiscarded();
      }
    }

    const wholeFile = rowSet.size === this.changedLineCount;
    const status = this.getStatus() === 'deleted' && !wholeFile ? 'modified' : this.getStatus();
    return this.clone({hunks, status, bufferText: builder.getBufferText()});
  }

  getUnstagePatchForLines(rowSet) {
    const builder = new BufferBuilder(this.getBufferText());
    const hunks = [];
    let newRowDelta = 0;

    for (const hunk of this.getHunks()) {
      const changes = [];
      let noNewlineChange = null;
      let contextRowCount = 0;
      let additionRowCount = 0;
      let deletionRowCount = 0;

      for (const region of hunk.getRegions()) {
        for (const {intersection, gap} of region.getRowRange().intersectRowsIn(rowSet, this.getBufferText(), true)) {
          region.when({
            addition: () => {
              if (gap) {
                // Unselected addition: become a context line.
                builder.append(intersection);
                contextRowCount += intersection.bufferRowCount();
              } else {
                // Selected addition: become a deletion.
                builder.append(intersection);
                changes.push(new Deletion(
                  builder.applyOffsetTo(intersection),
                ));
                deletionRowCount += intersection.bufferRowCount();
              }
            },
            deletion: () => {
              if (gap) {
                // Non-selected deletion: omit from new buffer.
                builder.remove(intersection);
              } else {
                // Selected deletion: becomes an addition
                builder.append(intersection);
                changes.push(new Addition(
                  builder.applyOffsetTo(intersection),
                ));
                additionRowCount += intersection.bufferRowCount();
              }
            },
            unchanged: () => {
              // Untouched context line: include in new patch.
              builder.append(intersection);
              contextRowCount += intersection.bufferRowCount();
            },
            nonewline: () => {
              // Nonewline marker: include in new patch.
              builder.append(intersection);
              noNewlineChange = new NoNewline(
                builder.applyOffsetTo(intersection),
              );
            },
          });
        }
      }

      if (changes.length > 0) {
        // Hunk contains at least one selected line
        if (noNewlineChange !== null) {
          changes.push(noNewlineChange);
        }

        hunks.push(new Hunk({
          oldStartRow: hunk.getNewStartRow(),
          oldRowCount: contextRowCount + deletionRowCount,
          newStartRow: hunk.getNewStartRow() + newRowDelta,
          newRowCount: contextRowCount + additionRowCount,
          sectionHeading: hunk.getSectionHeading(),
          rowRange: builder.applyHunkOffsetsTo(hunk.getRowRange()),
          changes,
        }));

        builder.latestHunkWasIncluded();
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

    return this.clone({hunks, status, bufferText: builder.getBufferText()});
  }

  getFullUnstagedPatch() {
    let newRowDelta = 0;
    const hunks = this.getHunks().map(hunk => {
      const changes = hunk.getChanges().map(change => change.invert());
      const newHunk = new Hunk({
        oldStartRow: hunk.getNewStartRow(),
        oldRowCount: hunk.getNewRowCount(),
        newStartRow: hunk.getNewStartRow() + newRowDelta,
        newRowCount: hunk.getOldRowCount(),
        rowRange: hunk.getRowRange(),
        changes,
      });
      newRowDelta += newHunk.getNewRowCount() - newHunk.getOldRowCount();
      return newHunk;
    });
    const status = this.getStatus() === 'added' ? 'deleted' : this.getStatus();
    return this.clone({hunks, status});
  }

  toString() {
    return this.getHunks().reduce((str, hunk) => {
      str += hunk.toStringIn(this.getBufferText());
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

  getBufferText() {
    return '';
  },

  getByteSize() {
    return 0;
  },

  getChangedLineCount() {
    return 0;
  },

  clone(opts = {}) {
    if (opts.status === undefined && opts.hunks === undefined && opts.bufferText === undefined) {
      return this;
    } else {
      return new Patch({
        status: opts.status !== undefined ? opts.status : this.getStatus(),
        hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
        bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
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

  toString() {
    return '';
  },

  isPresent() {
    return false;
  },
};
