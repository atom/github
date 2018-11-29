const UNBORN = Symbol('unborn');

// Truncation elipsis styles
const WORD_ELIPSES = '...';
const NEWLINE_ELIPSES = '\n...';
const PARAGRAPH_ELIPSES = '\n\n...';

export default class Commit {
  static LONG_MESSAGE_THRESHOLD = 500;

  static NEWLINE_THRESHOLD = 9;

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
    if (this.getMessageBody().length > this.constructor.LONG_MESSAGE_THRESHOLD) {
      return true;
    }

    if ((this.getMessageBody().match(/\r?\n/g) || []).length > this.constructor.NEWLINE_THRESHOLD) {
      return true;
    }

    return false;
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

    const {LONG_MESSAGE_THRESHOLD, NEWLINE_THRESHOLD} = this.constructor;

    let lastNewlineCutoff = null;
    let lastParagraphCutoff = null;
    let lastWordCutoff = null;

    const searchText = this.getMessageBody().substring(0, LONG_MESSAGE_THRESHOLD);
    const boundaryRx = /\s+/g;
    let result;
    let lineCount = 0;
    while ((result = boundaryRx.exec(searchText)) !== null) {
      const newlineCount = (result[0].match(/\r?\n/g) || []).length;

      lineCount += newlineCount;
      if (lineCount > NEWLINE_THRESHOLD) {
        lastNewlineCutoff = result.index;
        break;
      }

      if (newlineCount < 2 && result.index <= LONG_MESSAGE_THRESHOLD - WORD_ELIPSES.length) {
        lastWordCutoff = result.index;
      } else if (result.index < LONG_MESSAGE_THRESHOLD - PARAGRAPH_ELIPSES.length) {
        lastParagraphCutoff = result.index;
      }
    }

    let elipses = WORD_ELIPSES;
    let cutoffIndex = LONG_MESSAGE_THRESHOLD - WORD_ELIPSES.length;
    if (lastNewlineCutoff !== null) {
      elipses = NEWLINE_ELIPSES;
      cutoffIndex = lastNewlineCutoff;
    } else if (lastParagraphCutoff !== null) {
      elipses = PARAGRAPH_ELIPSES;
      cutoffIndex = lastParagraphCutoff;
    } else if (lastWordCutoff !== null) {
      cutoffIndex = lastWordCutoff;
    }

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
