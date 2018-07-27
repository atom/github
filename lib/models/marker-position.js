import {Range} from 'atom';

class Position {
  markOn(markable, options) {
    throw new Error('markOn not overridden');
  }

  setIn(marker) {
    throw new Error('setIn not overridden');
  }

  matches(other) {
    throw new Error('matches not overridden');
  }

  matchFromBufferRange(other) {
    return false;
  }

  matchFromScreenRange(other) {
    return false;
  }
}

class BufferRangePosition extends Position {
  constructor(bufferRange) {
    super();
    this.bufferRange = Range.fromObject(bufferRange);
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

  toString() {
    return `buffer(${this.bufferRange.toString()})`;
  }
}

class ScreenRangePosition extends Position {
  constructor(screenRange) {
    super();
    this.screenRange = screenRange;
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

  toString() {
    return `screen(${this.screenRange.toString()})`;
  }
}

class BufferOrScreenRangePosition extends Position {
  constructor(bufferRange, screenRange) {
    super();
    this.bufferRange = bufferRange;
    this.screenRange = screenRange;
  }

  markOn(markable, options) {
    return markable.markBufferRange(this.bufferRange);
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

  toString() {
    return `either(b${this.bufferRange.toString()}/s${this.screenRange.toString()})`;
  }
}

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
