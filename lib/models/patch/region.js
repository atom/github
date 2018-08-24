class Region {
  constructor(range) {
    this.range = range;
  }

  getRowRange() {
    return this.range;
  }

  getStartBufferRow() {
    return this.range.getStartBufferRow();
  }

  getEndBufferRow() {
    return this.range.getEndBufferRow();
  }

  includesBufferRow(row) {
    return this.range.includesRow(row);
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
    return this.range.getBufferRows();
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
    return new Deletion(this.getRowRange());
  }
}

export class Deletion extends Region {
  static origin = '-';

  isDeletion() {
    return true;
  }

  invert() {
    return new Addition(this.getRowRange());
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
