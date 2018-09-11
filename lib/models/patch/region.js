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
