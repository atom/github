const UNBORN = Symbol('unborn');

export default class Commit {
  static LONG_MESSAGE_THRESHOLD = 1000;

  static createUnborn() {
    return new Commit({unbornRef: UNBORN});
  }

  constructor({sha, authorEmail, coAuthors, authorDate, messageSubject, messageBody, unbornRef}) {
    this.sha = sha;
    this.authorEmail = authorEmail;
    this.coAuthors = coAuthors || [];
    this.authorDate = authorDate;
    this.messageSubject = messageSubject;
    this.messageBody = messageBody;
    this.unbornRef = unbornRef === UNBORN;
    this.multiFileDiff = null;
  }

  getSha() {
    return this.sha;
  }

  getAuthorEmail() {
    return this.authorEmail;
  }

  getAuthorDate() {
    return this.authorDate;
  }

  getCoAuthors() {
    return this.coAuthors;
  }

  getMessageSubject() {
    return this.messageSubject;
  }

  getMessageBody() {
    return this.messageBody;
  }

  isBodyLong() {
    return this.getMessageBody().length > this.constructor.LONG_MESSAGE_THRESHOLD;
  }

  getFullMessage() {
    return `${this.getMessageSubject()}\n\n${this.getMessageBody()}`.trim();
  }

  setMultiFileDiff(multiFileDiff) {
    this.multiFileDiff = multiFileDiff;
  }

  getMultiFileDiff() {
    return this.multiFileDiff;
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

  getMessageSubject() {
    return '';
  },

  isUnbornRef() {
    return false;
  },

  isPresent() {
    return false;
  },

  isBodyLong() {
    return false;
  },
};
