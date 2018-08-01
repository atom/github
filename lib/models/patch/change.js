import {nullPosition} from '../marker-position';

// A contiguous region of additions or deletions within a {Hunk}.
//
// The Change's position is a {MarkerPosition} containing a {Range} of the change rows within the diff buffer. The
// calculated offsets delimit a half-open interval of {String} code point offsets within the diff buffer, such that
// `buffer.slice(startOffset, endOffset)` returns the exact contents of the changed lines, including the last line
// and its line-end character.
export default class Change {
  constructor({position, startOffset, endOffset}) {
    this.position = position;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }

  markOn(markable, options) {
    return this.position.markOn(markable, options);
  }

  setIn(marker) {
    return this.position.setIn(marker);
  }

  bufferRowCount() {
    return this.position.bufferRowCount();
  }

  toStringIn(buffer, origin) {
    let str = '';
    for (let offset = this.startOffset; offset < this.endOffset; offset++) {
      const ch = buffer[offset];
      if (offset === this.startOffset) {
        str += origin;
      }
      str += ch;
      if (ch === '\n' && offset !== this.endOffset - 1) {
        str += origin;
      }
    }
    return str;
  }

  intersectRowsIn(rowSet, buffer) {
    const intPositions = this.position.intersectRows(rowSet);
    const intChanges = [];
    let intIndex = 0;
    let currentRow = this.position.bufferStartRow();
    let currentOffset = this.startOffset;
    let nextStartOffset = null;

    while (intIndex < intPositions.length && currentOffset < this.endOffset) {
      const currentInt = intPositions[intIndex];

      if (currentRow === currentInt.bufferStartRow()) {
        nextStartOffset = currentOffset;
      }

      if (currentRow === currentInt.bufferEndRow() + 1) {
        intChanges.push(new this.constructor({
          position: currentInt,
          startOffset: nextStartOffset,
          endOffset: currentOffset,
        }));

        intIndex++;
        nextStartOffset = null;
      }

      currentOffset = buffer.indexOf('\n', currentOffset) + 1;
      currentRow++;
    }

    if (intIndex < intPositions.length && nextStartOffset !== null) {
      intChanges.push(new this.constructor({
        position: intPositions[intIndex],
        startOffset: nextStartOffset,
        endOffset: currentOffset,
      }));
    }

    return intChanges;
  }

  isPresent() {
    return true;
  }
}

export const nullChange = {
  markOn(...args) {
    return nullPosition.markOn(...args);
  },

  setIn(...args) {
    return nullPosition.setIn(...args);
  },

  bufferRowCount() {
    return nullPosition.bufferRowCount();
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
