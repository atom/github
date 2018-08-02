export default class Patch {
  constructor({status, hunks, bufferText}) {
    this.status = status;
    this.hunks = hunks;
    this.bufferText = bufferText;
  }

  getStatus() {
    return this.status;
  }

  getHunks() {
    return this.hunks;
  }

  getBufferText() {
    return this.bufferText;
  }

  getByteSize() {
    return Buffer.byteLength(this.bufferText, 'utf8');
  }

  clone(opts = {}) {
    return new this.constructor({
      status: opts.status !== undefined ? opts.status : this.getStatus(),
      hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
      bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
    });
  }

  toString() {
    return this.getHunks().reduce((str, hunk) => {
      str += hunk.toStringIn(this.getBufferText());
      return str;
    }, '');
  }

  isPresent() {
    return true;
  }
}

export const nullPatch = {
  getStatus() {
    return null;
  },

  getHunks() {
    return [];
  },

  getBufferText() {
    return '';
  },

  getByteSize() {
    return 0;
  },

  clone(opts = {}) {
    if (opts.status === undefined && opts.hunks === undefined && opts.bufferText === undefined) {
      return this;
    } else {
      return new Patch({
        status: opts.status !== undefined ? opts.status : this.getStatus(),
        hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
        bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
      });
    }
  },

  isPresent() {
    return false;
  },
};
