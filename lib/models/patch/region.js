import {Range} from 'atom';

class Region {
  constructor(range) {
    this.range = range;
  }

  getRange() {
    return this.range;
  }

  getStartBufferRow() {
    return this.range.start.row;
  }

  getEndBufferRow() {
    return this.range.end.row;
  }

  includesBufferRow(row) {
    return this.range.intersectsRow(row);
  }

  intersectRows(rowSet, includeGaps) {
    const intersections = [];
    let withinIntersection = false;

    let currentRow = this.range.start.row;
    let nextStartRow = currentRow;

    const finishRowRange = isGap => {
      if (isGap && !includeGaps) {
        nextStartRow = currentRow;
        return;
      }

      if (currentRow <= this.range.start.row) {
        return;
      }

      intersections.push({
        intersection: Range.fromObject([[nextStartRow, 0], [currentRow - 1, Infinity]]),
        gap: isGap,
      });

      nextStartRow = currentRow;
    };

    while (currentRow <= this.range.end.row) {
      if (rowSet.has(currentRow) && !withinIntersection) {
        // One row past the end of a gap. Start of intersecting row range.
        finishRowRange(true);
        withinIntersection = true;
      } else if (!rowSet.has(currentRow) && withinIntersection) {
        // One row past the end of intersecting row range. Start of the next gap.
        finishRowRange(false);
        withinIntersection = false;
      }

      currentRow++;
    }

    finishRowRange(!withinIntersection);
    return intersections;
  }

  isAddition() {
    return false;
  }

  isDeletion() {
    return false;
  }

  isUnchanged() {
    return false;
  }

  isNoNewline() {
    return false;
  }

  getBufferRows() {
    return this.range.getRows();
  }

  bufferRowCount() {
    return this.range.getRowCount();
  }

  when(callbacks) {
    const callback = callbacks[this.constructor.name.toLowerCase()] || callbacks.default || (() => undefined);
    return callback();
  }

  toStringIn(buffer) {
    return buffer.getTextInRange(this.range).replace(/(^|\n)(?!$)/g, '$&' + this.constructor.origin);
  }

  invert() {
    return this;
  }

  isChange() {
    return true;
  }
}

export class Addition extends Region {
  static origin = '+';

  isAddition() {
    return true;
  }

  invert() {
    return new Deletion(this.getRange());
  }
}

export class Deletion extends Region {
  static origin = '-';

  isDeletion() {
    return true;
  }

  invert() {
    return new Addition(this.getRange());
  }
}

export class Unchanged extends Region {
  static origin = ' ';

  isUnchanged() {
    return true;
  }

  isChange() {
    return false;
  }
}

export class NoNewline extends Region {
  static origin = '\\';

  isNoNewline() {
    return true;
  }

  isChange() {
    return false;
  }
}
