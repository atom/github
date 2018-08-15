import IndexedRowRange, {nullIndexedRowRange} from '../indexed-row-range';

export default class Hunk {
  constructor({
    oldStartRow,
    newStartRow,
    oldRowCount,
    newRowCount,
    sectionHeading,
    rowRange,
    additions,
    deletions,
    noNewline,
  }) {
    this.oldStartRow = oldStartRow;
    this.newStartRow = newStartRow;
    this.oldRowCount = oldRowCount;
    this.newRowCount = newRowCount;
    this.sectionHeading = sectionHeading;

    this.rowRange = rowRange;
    this.additions = additions;
    this.deletions = deletions;
    this.noNewline = noNewline;
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

  getAdditions() {
    return this.additions;
  }

  getDeletions() {
    return this.deletions;
  }

  getNoNewline() {
    return this.noNewline;
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
    return [
      this.additions,
      this.deletions,
      [this.noNewline],
    ].reduce((count, ranges) => {
      return ranges.reduce((subCount, range) => subCount + range.bufferRowCount(), count);
    }, 0);
  }

  invert() {
    return new Hunk({
      oldStartRow: this.getNewStartRow(),
      newStartRow: this.getOldStartRow(),
      oldRowCount: this.getNewRowCount(),
      newRowCount: this.getOldRowCount(),
      sectionHeading: this.getSectionHeading(),
      rowRange: this.rowRange,
      additions: this.getDeletions(),
      deletions: this.getAdditions(),
      noNewline: this.getNoNewline(),
    });
  }

  toStringIn(bufferText) {
    let str = this.getHeader() + '\n';

    let additionIndex = 0;
    let deletionIndex = 0;

    const endRange = new IndexedRowRange({
      bufferRange: [[0, 0], [0, 0]],
      startOffset: this.rowRange.endOffset,
      endOffset: this.rowRange.endOffset,
    });

    const nextRange = () => {
      const nextAddition = this.additions[additionIndex] || nullIndexedRowRange;
      const nextDeletion = this.deletions[deletionIndex] || nullIndexedRowRange;

      const minRange = [this.noNewline, nextAddition, nextDeletion, endRange].reduce((least, range) => {
        return range.startOffset < least.startOffset ? range : least;
      });

      const unchanged = minRange.startOffset === currentOffset
        ? nullIndexedRowRange
        : new IndexedRowRange({
          bufferRange: [[0, 0], [0, 0]],
          startOffset: currentOffset,
          endOffset: minRange.startOffset,
        });

      if (minRange === nextAddition) {
        additionIndex++;
        return {origin: '+', range: minRange, unchanged};
      } else if (minRange === nextDeletion) {
        deletionIndex++;
        return {origin: '-', range: minRange, unchanged};
      } else if (minRange === endRange) {
        return {origin: ' ', range: minRange, unchanged};
      } else {
        return {origin: '\\', range: this.noNewline, unchanged};
      }
    };

    let currentOffset = this.rowRange.startOffset;
    while (currentOffset < bufferText.length) {
      const {origin, range, unchanged} = nextRange();
      str += unchanged.toStringIn(bufferText, ' ');

      if (range === endRange) {
        break;
      }

      str += range.toStringIn(bufferText, origin);
      currentOffset = range.endOffset;
    }
    return str;
  }
}
