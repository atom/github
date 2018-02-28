import {Emitter} from 'event-kit';

const LOADING_AVATAR_URL = 'atom://github/img/avatar.svg';

export default class AvatarCache {
  constructor(request) {
    this.byEmail = new Map();
    this.emitter = new Emitter();
    this.request = request;
  }

  avatarsForEmails(emails) {
    const requests = [];
    const responses = emails.map(email => {
      let response = this.byEmail.get(email);
      if (response === undefined) {
        requests.push(email);
        response = LOADING_AVATAR_URL;
      }
      return response;
    });
    if (requests.length) {
      this.request(requests);
    }
    return responses;
  }

  addAll(byEmail) {
    for (const email in byEmail) {
      this.byEmail.set(email, byEmail[email]);
    }
    this.emitter.emit('did-update');
  }

  onDidUpdate(callback) {
    return this.emitter.on('did-update', callback);
  }
}
