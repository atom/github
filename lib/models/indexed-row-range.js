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

  getBufferRows() {
    return this.bufferRange.getRows();
  }

  getStartRange() {
    const start = this.bufferRange.start;
    return new Range(start, start);
  }

  bufferRowCount() {
    return this.bufferRange.getRowCount();
  }

  toStringIn(buffer, prefix) {
    return buffer.slice(this.startOffset, this.endOffset).replace(/(^|\n)(?!$)/g, '$&' + prefix);
  }

  // Identify {IndexedRowRanges} within our bufferRange that intersect the rows in rowSet. If {includeGaps} is true,
  // also return an {IndexedRowRange} for each gap between intersecting ranges.
  intersectRowsIn(rowSet, buffer, includeGaps) {
    const intersections = [];
    let withinIntersection = false;

    let currentRow = this.bufferRange.start.row;
    let currentOffset = this.startOffset;
    let nextStartRow = currentRow;
    let nextStartOffset = currentOffset;

    const finishRowRange = isGap => {
      if (isGap && !includeGaps) {
        nextStartRow = currentRow;
        nextStartOffset = currentOffset;
        return;
      }

      if (nextStartOffset === currentOffset) {
        return;
      }

      intersections.push({
        intersection: new IndexedRowRange({
          bufferRange: Range.fromObject([[nextStartRow, 0], [currentRow - 1, 0]]),
          startOffset: nextStartOffset,
          endOffset: currentOffset,
        }),
        gap: isGap,
      });

      nextStartRow = currentRow;
      nextStartOffset = currentOffset;
    };

    while (currentRow <= this.bufferRange.end.row) {
      if (rowSet.has(currentRow) && !withinIntersection) {
        // One row past the end of a gap. Start of intersecting row range.
        finishRowRange(true);
        withinIntersection = true;
      } else if (!rowSet.has(currentRow) && withinIntersection) {
        // One row past the end of intersecting row range. Start of the next gap.
        finishRowRange(false);
        withinIntersection = false;
      }

      currentOffset = buffer.indexOf('\n', currentOffset) + 1;
      currentRow++;
    }

    finishRowRange(!withinIntersection);
    return intersections;
  }

  offsetBy(bufferOffset, rowOffset) {
    if (bufferOffset === 0 && rowOffset === 0) {
      return this;
    }

    return new this.constructor({
      bufferRange: this.bufferRange.translate([rowOffset, 0]),
      startOffset: this.startOffset + bufferOffset,
      endOffset: this.endOffset + bufferOffset,
    });
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
  startOffset: Infinity,

  endOffset: Infinity,

  bufferRowCount() {
    return 0;
  },

  toStringIn() {
    return '';
  },

  intersectRowsIn() {
    return [];
  },

  offsetBy() {
    return this;
  },

  isPresent() {
    return false;
  },
};
