import IndexedRowRange, {nullIndexedRowRange} from '../indexed-row-range';

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

  getAdditions() {
    return this.changes.filter(change => change.isAddition()).map(change => change.getRange());
  }

  getDeletions() {
    return this.changes.filter(change => change.isDeletion()).map(change => change.getRange());
  }

  getNoNewline() {
    const lastChange = this.changes[this.changes.length - 1];
    if (lastChange && lastChange.isNoNewline()) {
      return lastChange.getRange();
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

    let currentOffset = this.rowRange.startOffset;
    for (const change of this.getChanges()) {
      const range = change.getRowRange();
      if (range.startOffset !== currentOffset) {
        const unchanged = new IndexedRowRange({
          bufferRange: [[0, 0], [0, 0]],
          startOffset: currentOffset,
          endOffset: range.startOffset,
        });
        str += unchanged.toStringIn(bufferText, ' ');
      }

      str += change.toStringIn(bufferText);
      currentOffset = range.endOffset;
    }

    if (currentOffset !== this.rowRange.endOffset) {
      const unchanged = new IndexedRowRange({
        bufferRange: [[0, 0], [0, 0]],
        startOffset: currentOffset,
        endOffset: this.rowRange.endOffset,
      });
      str += unchanged.toStringIn(bufferText, ' ');
    }

    return str;
  }
}
