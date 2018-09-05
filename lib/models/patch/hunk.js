import IndexedRowRange from '../indexed-row-range';
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
          bufferRange: [[currentRow, 0], [startRow - 1, Infinity]],
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
        bufferRange: [[currentRow, 0], [endRow, this.rowRange.bufferRange.end.column]],
        startOffset: currentPosition,
        endOffset: endPosition,
      })));
    }

    return regions;
  }

  getAdditionRanges() {
    return this.changes.filter(change => change.isAddition()).map(change => change.getRowRange().bufferRange);
  }

  getDeletionRanges() {
    return this.changes.filter(change => change.isDeletion()).map(change => change.getRowRange().bufferRange);
  }

  getNoNewlineRange() {
    const lastChange = this.changes[this.changes.length - 1];
    if (lastChange && lastChange.isNoNewline()) {
      return lastChange.getRowRange().bufferRange;
    } else {
      return null;
    }
  }

  getRowRange() {
    return this.rowRange;
  }

  getBufferRange() {
    return this.rowRange.bufferRange;
  }

  getBufferRows() {
    return this.rowRange.getBufferRows();
  }

  bufferRowCount() {
    return this.rowRange.bufferRowCount();
  }

  includesBufferRow(row) {
    return this.rowRange.includesRow(row);
  }

  getOldRowAt(row) {
    let current = this.oldStartRow;

    for (const region of this.getRegions()) {
      if (region.range.includesRow(row)) {
        const offset = row - region.getStartBufferRow();

        return region.when({
          unchanged: () => current + offset,
          addition: () => null,
          deletion: () => current + offset,
          nonewline: () => null,
        });
      } else {
        current += region.when({
          unchanged: () => region.bufferRowCount(),
          addition: () => 0,
          deletion: () => region.bufferRowCount(),
          nonewline: () => 0,
        });
      }
    }

    return null;
  }

  getNewRowAt(row) {
    let current = this.newStartRow;

    for (const region of this.getRegions()) {
      if (region.includesBufferRow(row)) {
        const offset = row - region.getStartBufferRow();

        return region.when({
          unchanged: () => current + offset,
          addition: () => current + offset,
          deletion: () => null,
          nonewline: () => null,
        });
      } else {
        current += region.when({
          unchanged: () => region.bufferRowCount(),
          addition: () => region.bufferRowCount(),
          deletion: () => 0,
          nonewline: () => 0,
        });
      }
    }

    return null;
  }

  getMaxLineNumberWidth() {
    return Math.max(
      (this.oldStartRow + this.oldRowCount).toString().length,
      (this.newStartRow + this.newRowCount).toString().length,
    );
  }

  changedLineCount() {
    return this.changes.reduce((count, change) => change.when({
      nonewline: () => count,
      default: () => count + change.getRowRange().bufferRowCount(),
    }), 0);
  }

  toStringIn(bufferText) {
    let str = this.getHeader() + '\n';
    for (const region of this.getRegions()) {
      str += region.toStringIn(bufferText);
    }
    return str;
  }
}
