import {Range} from 'atom';
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

    this.range = rowRange;
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
    let currentRow = this.range.start.row;

    for (const change of this.changes) {
      const startRow = change.getRange().start.row;

      if (currentRow !== startRow) {
        regions.push(new Unchanged(
          Range.fromObject([[currentRow, 0], [startRow - 1, Infinity]]),
        ));
      }

      regions.push(change);

      currentRow = change.getRange().end.row + 1;
    }

    const endRow = this.range.end.row;

    if (currentRow <= endRow) {
      regions.push(new Unchanged(
        Range.fromObject([[currentRow, 0], [endRow, this.range.end.column]]),
      ));
    }

    return regions;
  }

  getAdditionRanges() {
    return this.changes.filter(change => change.isAddition()).map(change => change.getRange());
  }

  getDeletionRanges() {
    return this.changes.filter(change => change.isDeletion()).map(change => change.getRange());
  }

  getNoNewlineRange() {
    const lastChange = this.changes[this.changes.length - 1];
    if (lastChange && lastChange.isNoNewline()) {
      return lastChange.getRange();
    } else {
      return null;
    }
  }

  getRange() {
    return this.range;
  }

  getBufferRows() {
    return this.range.getRows();
  }

  bufferRowCount() {
    return this.range.getRowCount();
  }

  includesBufferRow(row) {
    return this.range.intersectsRow(row);
  }

  getOldRowAt(row) {
    let current = this.oldStartRow;

    for (const region of this.getRegions()) {
      if (region.includesBufferRow(row)) {
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
      default: () => count + change.bufferRowCount(),
    }), 0);
  }

  toStringIn(buffer) {
    let str = this.getHeader() + '\n';
    for (const region of this.getRegions()) {
      str += region.toStringIn(buffer);
      str += '\n';
    }
    return str;
  }
}
