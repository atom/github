const DETACHED = {};

export default class Branch {
  constructor(name, detached = null) {
    this.name = name;
    this.detached = detached === DETACHED;
  }

  static createDetached(describe) {
    return new Branch(describe, DETACHED);
  }

  getName() {
    return this.name;
  }

  isDetached() {
    return this.detached;
  }

  isPresent() {
    return true;
  }
}

export const nullBranch = {
  getName() {
    return '';
  },

  isDetached() {
    return false;
  },

  isPresent() {
    return false;
  },
};
