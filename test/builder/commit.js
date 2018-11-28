import moment from 'moment';

import Commit from '../../lib/models/commit';

class CommitBuilder {
  constructor() {
    this._sha = '0123456789abcdefghij0123456789abcdefghij';
    this._authorEmail = 'default@email.com';
    this._authorDate = moment('2018-11-28T12:00:00', moment.ISO_8601).unix();
    this._coAuthors = [];
    this._messageSubject = 'subject';
    this._messageBody = 'body';
  }

  sha(newSha) {
    this._sha = newSha;
    return this;
  }

  authorEmail(newEmail) {
    this._authorEmail = newEmail;
    return this;
  }

  authorDate(timestamp) {
    this._authorDate = timestamp;
    return this;
  }

  messageSubject(subject) {
    this._messageSubject = subject;
    return this;
  }

  messageBody(body) {
    this._messageBody = body;
    return this;
  }

  build() {
    return new Commit({
      sha: this._sha,
      authorEmail: this._authorEmail,
      authorDate: this._authorDate,
      coAuthors: this._coAuthors,
      messageSubject: this._messageSubject,
      messageBody: this._messageBody,
    });
  }
}

export function commitBuilder() {
  return new CommitBuilder();
}
