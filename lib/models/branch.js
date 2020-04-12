import moment from 'moment';

/**
 * Fully-qualified name of a git reference, like `refs/heads/master`.
 */
export class RefName {
  constructor(fullName) {
    this.fullName = fullName;
  }

  full() {
    return this.fullName;
  }

  short() {
    return this.fullName.replace(/^refs\/(?:heads|remotes|tags)\//, '');
  }

  isPresent() {
    return true;
  }

  orElse() {
    return this;
  }

  static from(name) {
    return (name != null && name !== '') ? new this(name) : nullRefName;
  }
}

export const nullRefName = {
  full() {
    return '';
  },

  short() {
    return '';
  },

  isPresent() {
    return false;
  },

  orElse(alternative) {
    return alternative;
  },
};

/**
 * The output of `git describe` for a detached HEAD. Interface-compatible with
 * a RefName.
 */
export class DescribedName {
  constructor(description) {
    this.description = description;
  }

  full() {
    return this.description;
  }

  short() {
    return this.description;
  }
}

/**
 * Local reference specified as a fetch or push destination for a particular
 * branch.
 */
export class LocalRef {
  constructor(refName, remoteName, remoteRefName, fallback) {
    this.refName = RefName.from(refName).orElse(fallback.getRefName());
    this.remoteName = (remoteName != null && remoteName !== '') ? remoteName : fallback.getRemoteName();
    this.remoteRefName = RefName.from(remoteRefName).orElse(fallback.getRemoteRefName());
  }

  getRefName() {
    return this.refName;
  }

  getRemoteName() {
    return this.remoteName;
  }

  getRemoteRefName() {
    return this.remoteRefName;
  }

  isPresent() {
    return true;
  }

  static from(refName, remoteName, remoteRefName, fallback = nullLocalRef) {
    if ([refName, remoteName, remoteRefName].some(str => Boolean(str) && str.length > 0)) {
      return new this(refName, remoteName, remoteRefName, fallback);
    } else {
      return fallback;
    }
  }
}

export const nullLocalRef = {
  getRefName() {
    return nullRefName;
  },

  getRemoteName() {
    return '';
  },

  getRemoteRefName() {
    return nullRefName;
  },

  isPresent() {
    return false;
  },
};

export default class Branch {
  constructor(name, options = {}) {
    this.detached = Boolean(options.detached);
    this.head = Boolean(options.head);

    this.name = this.detached ? new DescribedName(name) : RefName.from(name);

    const up = options.upstream || {};
    this.upstream = LocalRef.from(up.refName, up.remoteName, up.remoteRefName);

    const push = options.push || {};
    this.push = LocalRef.from(push.refName, push.remoteName, push.remoteRefName, this.upstream);

    this.sha = options.sha || '';

    // Wed Mar 11 10:36:38 2020 -0400
    // ddd MMM D H:mm:ss YYYY Z
    this.committerDate = options.committerDate
      ? moment(options.committerDate, 'ddd MMM D HH:mm:ss YYYY Z')
      : null;
  }

  getName() {
    return this.name;
  }

  getUpstream() {
    return this.upstream;
  }

  getPush() {
    return this.push;
  }

  getFetchRefSpec() {
    const u = this.upstream;
    if (!u.isPresent()) {
      return '';
    }
    return `${u.getRemoteRefName().full()}:${u.getRefName().full()}`;
  }

  getPushRefSpec() {
    const p = this.push;
    if (!p.isPresent()) {
      return '';
    }
    return `${this.getName().full()}:${p.getRemoteRefName().full()}`;
  }

  getSha() {
    return this.sha;
  }

  getCommitterDate() {
    return this.committerDate;
  }

  isHead() {
    return this.head;
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
    return nullRefName;
  },

  getUpstream() {
    return nullLocalRef;
  },

  getPush() {
    return nullLocalRef;
  },

  getPullRefSpec() {
    return '';
  },

  getPushRefSpec() {
    return '';
  },

  isHead() {
    return false;
  },

  isDetached() {
    return false;
  },

  getSha() {
    return '';
  },

  getCommitterDate() {
    return null;
  },

  isPresent() {
    return false;
  },

  inspect() {
    return '{nullBranch}';
  },
};
