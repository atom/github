import IndexedRowRange, {nullIndexedRowRange} from '../indexed-row-range';
import {Unchanged} from './region';

export default class Hunk {
  constructor({
    oldStartRow,
    newStartRow,
    oldRowCount,
    newRowCount,
    sectionHeading,
    rowRange,
    changes,
  }) {
    this.oldStartRow = oldStartRow;
    this.newStartRow = newStartRow;
    this.oldRowCount = oldRowCount;
    this.newRowCount = newRowCount;
    this.sectionHeading = sectionHeading;

    this.rowRange = rowRange;
    this.changes = changes;
  }

  getOldStartRow() {
    return this.oldStartRow;
  }

  getNewStartRow() {
    return this.newStartRow;
  }

  getOldRowCount() {
    return this.oldRowCount;
  }

  getNewRowCount() {
    return this.newRowCount;
  }

  getHeader() {
    return `@@ -${this.oldStartRow},${this.oldRowCount} +${this.newStartRow},${this.newRowCount} @@`;
  }

  getSectionHeading() {
    return this.sectionHeading;
  }

  getChanges() {
    return this.changes;
  }

  getRegions() {
    const regions = [];
    let currentRow = this.rowRange.bufferRange.start.row;
    let currentPosition = this.rowRange.startOffset;

    for (const change of this.changes) {
      const startRow = change.getRowRange().bufferRange.start.row;
      const startPosition = change.getRowRange().startOffset;

      if (currentRow !== startRow) {
        regions.push(new Unchanged(new IndexedRowRange({
          bufferRange: [[currentRow, 0], [startRow - 1, 0]],
          startOffset: currentPosition,
          endOffset: startPosition,
        })));
      }

      regions.push(change);

      currentRow = change.getRowRange().bufferRange.end.row + 1;
      currentPosition = change.getRowRange().endOffset;
    }

    const endRow = this.rowRange.bufferRange.end.row;
    const endPosition = this.rowRange.endOffset;

    if (currentRow <= endRow) {
      regions.push(new Unchanged(new IndexedRowRange({
        bufferRange: [[currentRow, 0], [endRow, 0]],
        startOffset: currentPosition,
        endOffset: endPosition,
      })));
    }

    return regions;
  }

  getAdditionRanges() {
    return this.changes.filter(change => change.isAddition()).map(change => change.getRowRange());
  }

  getDeletionRanges() {
    return this.changes.filter(change => change.isDeletion()).map(change => change.getRowRange());
  }

  getNoNewlineRange() {
    const lastChange = this.changes[this.changes.length - 1];
    if (lastChange && lastChange.isNoNewline()) {
      return lastChange.getRowRange();
    } else {
      return nullIndexedRowRange;
    }
  }

  getRowRange() {
    return this.rowRange;
  }

  getStartRange() {
    return this.rowRange.getStartRange();
  }

  getBufferRows() {
    return this.rowRange.getBufferRows();
  }

  bufferRowCount() {
    return this.rowRange.bufferRowCount();
  }

  changedLineCount() {
    return this.changes.reduce((count, change) => change.when({
      nonewline: () => count,
      default: () => count + change.getRowRange().bufferRowCount(),
    }), 0);
  }

  invert() {
    return new Hunk({
      oldStartRow: this.getNewStartRow(),
      newStartRow: this.getOldStartRow(),
      oldRowCount: this.getNewRowCount(),
      newRowCount: this.getOldRowCount(),
      sectionHeading: this.getSectionHeading(),
      rowRange: this.rowRange,
      changes: this.getChanges().map(change => change.invert()),
    });
  }

  toStringIn(bufferText) {
    let str = this.getHeader() + '\n';
    for (const region of this.getRegions()) {
      str += region.toStringIn(bufferText);
    }
    return str;
  }
}
