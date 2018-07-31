import {Range} from 'atom';

class Position {
  constructor(bufferRange, screenRange) {
    this.bufferRange = bufferRange && Range.fromObject(bufferRange);
    this.screenRange = screenRange && Range.fromObject(screenRange);
  }

  /* istanbul ignore next */
  markOn(markable, options) {
    throw new Error('markOn not overridden');
  }

  /* istanbul ignore next */
  setIn(marker) {
    throw new Error('setIn not overridden');
  }

  /* istanbul ignore next */
  matches(other) {
    throw new Error('matches not overridden');
  }

  matchFromBufferRange(other) {
    return false;
  }

  matchFromScreenRange(other) {
    return false;
  }

  bufferStartRow() {
    return this.bufferRange !== null ? this.bufferRange.start.row : -1;
  }

  bufferRowCount() {
    return this.bufferRange !== null ? this.bufferRange.getRowCount() : 0;
  }

  intersectRows(rowSet) {
    if (this.bufferRange === null) {
      return [];
    }

    const intersections = [];
    let currentRangeStart = null;

    let row = this.bufferRange.start.row;
    while (row <= this.bufferRange.end.row) {
      if (rowSet.has(row) && currentRangeStart === null) {
        currentRangeStart = row;
      } else if (!rowSet.has(row) && currentRangeStart !== null) {
        intersections.push(
          fromBufferRange([[currentRangeStart, 0], [row - 1, 0]]),
        );
        currentRangeStart = null;
      }
      row++;
    }
    if (currentRangeStart !== null) {
      intersections.push(
        fromBufferRange([[currentRangeStart, 0], this.bufferRange.end]),
      );
    }

    return intersections;
  }

  /* istanbul ignore next */
  serialize() {
    throw new Error('serialize not overridden');
  }

  isPresent() {
    return true;
  }
}

class BufferRangePosition extends Position {
  constructor(bufferRange) {
    super(bufferRange, null);
  }

  markOn(markable, options) {
    return markable.markBufferRange(this.bufferRange, options);
  }

  setIn(marker) {
    return marker.setBufferRange(this.bufferRange);
  }

  matches(other) {
    return other.matchFromBufferRange(this);
  }

  matchFromBufferRange(other) {
    return other.bufferRange.isEqual(this.bufferRange);
  }

  serialize() {
    return this.bufferRange.serialize();
  }

  toString() {
    return `buffer(${this.bufferRange.toString()})`;
  }
}

class ScreenRangePosition extends Position {
  constructor(screenRange) {
    super(null, screenRange);
  }

  markOn(markable, options) {
    return markable.markScreenRange(this.screenRange, options);
  }

  setIn(marker) {
    return marker.setScreenRange(this.screenRange);
  }

  matches(other) {
    return other.matchFromScreenRange(this);
  }

  matchFromScreenRange(other) {
    return other.screenRange.isEqual(this.screenRange);
  }

  serialize() {
    return this.screenRange.serialize();
  }

  toString() {
    return `screen(${this.screenRange.toString()})`;
  }
}

class BufferOrScreenRangePosition extends Position {
  markOn(markable, options) {
    return markable.markBufferRange(this.bufferRange, options);
  }

  setIn(marker) {
    return marker.setBufferRange(this.bufferRange);
  }

  matches(other) {
    return other.matchFromBufferRange(this) || other.matchFromScreenRange(this);
  }

  matchFromBufferRange(other) {
    return other.bufferRange.isEqual(this.bufferRange);
  }

  matchFromScreenRange(other) {
    return other.screenRange.isEqual(this.screenRange);
  }

  serialize() {
    return this.bufferRange.serialize();
  }

  toString() {
    return `either(b${this.bufferRange.toString()}/s${this.screenRange.toString()})`;
  }
}

export const nullPosition = {
  markOn() {
    return null;
  },

  setIn() {},

  matches(other) {
    return other === this;
  },

  matchFromBufferRange() {
    return false;
  },

  matchFromScreenRange() {
    return false;
  },

  bufferStartRow() {
    return -1;
  },

  bufferRowCount() {
    return 0;
  },

  intersectRows() {
    return [];
  },

  serialize() {
    return null;
  },

  isPresent() {
    return false;
  },

  toString() {
    return 'null';
  },
};

export function fromBufferRange(bufferRange) {
  return new BufferRangePosition(Range.fromObject(bufferRange));
}

export function fromBufferPosition(bufferPoint) {
  return new BufferRangePosition(new Range(bufferPoint, bufferPoint));
}

export function fromScreenRange(screenRange) {
  return new ScreenRangePosition(Range.fromObject(screenRange));
}

export function fromScreenPosition(screenPoint) {
  return new ScreenRangePosition(new Range(screenPoint, screenPoint));
}

export function fromMarker(marker) {
  return new BufferOrScreenRangePosition(
    marker.getBufferRange(),
    marker.getScreenRange(),
  );
}

export function fromChangeEvent(event, reversed = false) {
  const oldBufferStartPosition = reversed ? event.oldHeadBufferPosition : event.oldTailBufferPosition;
  const oldBufferEndPosition = reversed ? event.oldTailBufferPosition : event.oldHeadBufferPosition;
  const oldScreenStartPosition = reversed ? event.oldHeadScreenPosition : event.oldTailScreenPosition;
  const oldScreenEndPosition = reversed ? event.oldTailScreenPosition : event.oldHeadScreenPosition;

  const newBufferStartPosition = reversed ? event.newHeadBufferPosition : event.newTailBufferPosition;
  const newBufferEndPosition = reversed ? event.newTailBufferPosition : event.newHeadBufferPosition;
  const newScreenStartPosition = reversed ? event.newHeadScreenPosition : event.newTailScreenPosition;
  const newScreenEndPosition = reversed ? event.newTailScreenPosition : event.newHeadScreenPosition;

  return {
    oldPosition: new BufferOrScreenRangePosition(
      new Range(oldBufferStartPosition, oldBufferEndPosition),
      new Range(oldScreenStartPosition, oldScreenEndPosition),
    ),
    newPosition: new BufferOrScreenRangePosition(
      new Range(newBufferStartPosition, newBufferEndPosition),
      new Range(newScreenStartPosition, newScreenEndPosition),
    ),
  };
}
