class Change {
  constructor(range) {
    this.range = range;
  }

  getRowRange() {
    return this.range;
  }

  isAddition() {
    return false;
  }

  isDeletion() {
    return false;
  }

  isNoNewline() {
    return false;
  }

  getBufferRows() {
    return this.range.getBufferRows();
  }

  getStartRange() {
    return this.range.getStartRange();
  }

  bufferRowCount() {
    return this.range.bufferRowCount();
  }

  when(callbacks) {
    const callback = callbacks[this.constructor.name.toLowerCase()] || callbacks.default || (() => undefined);
    return callback();
  }

  toStringIn(buffer) {
    return this.range.toStringIn(buffer, this.constructor.origin);
  }
}

export class Addition extends Change {
  static origin = '+';

  isAddition() {
    return true;
  }

  invert() {
    return new Deletion(this.getRowRange());
  }
}

export class Deletion extends Change {
  static origin = '-';

  isDeletion() {
    return true;
  }

  invert() {
    return new Addition(this.getRowRange());
  }
}

export class NoNewline extends Change {
  static origin = '\\';

  isNoNewline() {
    return true;
  }

  invert() {
    return this;
  }
}
