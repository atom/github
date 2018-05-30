const NEW = Symbol('new');

export const NO_REPLY_GITHUB_EMAIL = 'noreply@github.com';

export default class Author {
  constructor(email, fullName, login = null, isNew = null) {
    this.email = email;
    this.fullName = fullName;
    this.login = login;
    this.new = isNew === NEW;
  }

  static createNew(email, fullName) {
    return new this(email, fullName, null, NEW);
  }

  getEmail() {
    return this.email;
  }

  getFullName() {
    return this.fullName;
  }

  getLogin() {
    return this.login;
  }

  isNoReply() {
    return this.email === NO_REPLY_GITHUB_EMAIL;
  }

  hasLogin() {
    return this.login !== null;
  }

  isNew() {
    return this.new;
  }

  isPresent() {
    return true;
  }

  matches(other) {
    return this.getEmail() === other.getEmail();
  }

  toString() {
    let s = `${this.fullName} <${this.email}>`;
    if (this.hasLogin()) {
      s += ` @${this.login}`;
    }
    return s;
  }

  static compare(a, b) {
    if (a.getFullName() < b.getFullName()) { return -1; }
    if (a.getFullName() > b.getFullName()) { return 1; }
    return 0;
  }
}

export const nullAuthor = {
  getEmail() {
    return '';
  },

  getFullName() {
    return '';
  },

  getLogin() {
    return null;
  },

  isNoReply() {
    return false;
  },

  hasLogin() {
    return false;
  },

  isNew() {
    return false;
  },

  isPresent() {
    return false;
  },

  matches(other) {
    return other === this;
  },

  toString() {
    return 'null author';
  },
};
