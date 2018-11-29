const UNBORN = Symbol('unborn');

export default class Commit {
  static LONG_MESSAGE_THRESHOLD = 1000;

  static BOUNDARY_SEARCH_THRESHOLD = 100;

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

  /*
   * Return the messageBody, truncated before the character at LONG_MESSAGE_THRESHOLD. If a paragraph boundary is
   * found within BOUNDARY_SEARCH_THRESHOLD characters before that position, the message will be truncated at the
   * end of the previous paragraph. If there is no paragraph boundary found, but a word boundary is found within
   * that range, the text is truncated at that word boundary and an elipsis (...) is added. If neither are found,
   * the text is truncated hard at LONG_MESSAGE_THRESHOLD - 3 characters and an elipsis (...) is added.
   */
  abbreviatedBody() {
    if (!this.isBodyLong()) {
      return this.getMessageBody();
    }

    const {LONG_MESSAGE_THRESHOLD, BOUNDARY_SEARCH_THRESHOLD} = this.constructor;
    let elipses = '...';
    let lastParagraphIndex = Infinity;
    let lastWordIndex = Infinity;
    const lastSubwordIndex = BOUNDARY_SEARCH_THRESHOLD - elipses.length;

    const baseIndex = LONG_MESSAGE_THRESHOLD - BOUNDARY_SEARCH_THRESHOLD;
    const boundarySearch = this.getMessageBody().substring(baseIndex, LONG_MESSAGE_THRESHOLD);

    const boundaryRx = /\r?\n\r?\n|\s+/g;
    let result;
    while ((result = boundaryRx.exec(boundarySearch)) !== null) {
      if (/\r?\n\r?\n/.test(result[0])) {
        // Paragraph boundary. Omit the elipses
        lastParagraphIndex = result.index;
        elipses = '';
      } else if (result.index <= BOUNDARY_SEARCH_THRESHOLD - elipses.length) {
        // Word boundary. Only count if we have room for the elipses under the cutoff.
        lastWordIndex = result.index;
      }
    }

    const cutoffIndex = baseIndex + Math.min(lastParagraphIndex, lastWordIndex, lastSubwordIndex);
    return this.getMessageBody().substring(0, cutoffIndex) + elipses;
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
