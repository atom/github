export default class File {
  constructor({path, mode, symlink}) {
    this.path = path;
    this.mode = mode;
    this.symlink = symlink;
  }

  getPath() {
    return this.path;
  }

  getMode() {
    return this.mode;
  }

  getSymlink() {
    return this.symlink;
  }

  isSymlink() {
    return this.getMode() === '120000';
  }

  isRegularFile() {
    return this.getMode() === '100644' || this.getMode() === '100755';
  }

  isExecutable() {
    return this.getMode() === '100755';
  }

  isPresent() {
    return true;
  }

  isEqual(other) {
    if (!other.isPresent()) { return false; }

    return other === this || (
      this.path === other.path &&
      this.mode === other.mode &&
      this.symlink === other.symlink
    );
  }

  clone(opts = {}) {
    return new File({
      path: opts.path !== undefined ? opts.path : this.path,
      mode: opts.mode !== undefined ? opts.mode : this.mode,
      symlink: opts.symlink !== undefined ? opts.symlink : this.symlink,
    });
  }
}

export const nullFile = {
  getPath() {
    /* istanbul ignore next */
    return null;
  },

  getMode() {
    /* istanbul ignore next */
    return null;
  },

  getSymlink() {
    /* istanbul ignore next */
    return null;
  },

  isSymlink() {
    return false;
  },

  isRegularFile() {
    return false;
  },

  isExecutable() {
    return false;
  },

  isPresent() {
    return false;
  },

  isEqual(other) {
    return other === this;
  },

  clone(opts = {}) {
    if (opts.path === undefined && opts.mode === undefined && opts.symlink === undefined) {
      return this;
    } else {
      return new File({
        path: opts.path !== undefined ? opts.path : this.getPath(),
        mode: opts.mode !== undefined ? opts.mode : this.getMode(),
        symlink: opts.symlink !== undefined ? opts.symlink : this.getSymlink(),
      });
    }
  },
};
