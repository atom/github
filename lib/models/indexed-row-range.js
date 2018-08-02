import {Range} from 'atom';

// A {Range} of rows within a buffer accompanied by its corresponding start and end offsets.
//
// Note that the range's columns are disregarded for purposes of offset consistency.
export default class IndexedRowRange {
  constructor({bufferRange, startOffset, endOffset}) {
    this.bufferRange = Range.fromObject(bufferRange);
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }

  bufferRowCount() {
    return this.bufferRange.getRowCount();
  }

  toStringIn(buffer, prefix) {
    return buffer.slice(this.startOffset, this.endOffset).replace(/(^|\n)(?!$)/g, '$&' + prefix);
  }

  intersectRowsIn(rowSet, buffer) {
    // Identify Ranges within our bufferRange that intersect the rows in rowSet.
    const intersections = [];
    let nextStartRow = null;
    let nextStartOffset = null;

    let currentRow = this.bufferRange.start.row;
    let currentOffset = this.startOffset;

    while (currentRow <= this.bufferRange.end.row) {
      if (rowSet.has(currentRow) && nextStartRow === null) {
        // Start of intersecting row range
        nextStartRow = currentRow;
        nextStartOffset = currentOffset;
      } else if (!rowSet.has(currentRow) && nextStartRow !== null) {
        // One row past the end of intersecting row range
        intersections.push(new IndexedRowRange({
          bufferRange: Range.fromObject([[nextStartRow, 0], [currentRow - 1, 0]]),
          startOffset: nextStartOffset,
          endOffset: currentOffset,
        }));

        nextStartRow = null;
        nextStartOffset = null;
      }

      currentOffset = buffer.indexOf('\n', currentOffset) + 1;
      currentRow++;
    }

    if (nextStartRow !== null) {
      intersections.push(new IndexedRowRange({
        bufferRange: Range.fromObject([[nextStartRow, 0], this.bufferRange.end]),
        startOffset: nextStartOffset,
        endOffset: currentOffset,
      }));
    }

    return intersections;
  }

  serialize() {
    return {
      bufferRange: this.bufferRange.serialize(),
      startOffset: this.startOffset,
      endOffset: this.endOffset,
    };
  }

  isPresent() {
    return true;
  }
}

export const nullIndexedRowRange = {
  bufferRowCount() {
    return 0;
  },

  toStringIn() {
    return '';
  },

  intersectRowsIn() {
    return [];
  },

  isPresent() {
    return false;
  },
};
