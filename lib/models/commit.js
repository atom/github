const UNBORN = {};

export default class Commit {
  static createUnborn() {
    return new Commit('', '', UNBORN);
  }

  constructor(sha, message, unbornRef = null) {
    this.sha = sha;
    this.message = message.trim();
    this.unbornRef = unbornRef === UNBORN;
  }

  getSha() {
    return this.sha;
  }

  getMessage() {
    return this.message;
  }

  isUnbornRef() {
    return this.unbornRef;
  }

  isPresent() {
    return true;
  }
}

export const nullCommit = {
  getSha() {
    return '';
  },

  getMessage() {
    return '';
  },

  isUnbornRef() {
    return false;
  },

  isPresent() {
    return false;
  },
};
