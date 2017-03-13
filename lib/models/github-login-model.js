import {getPassword, replacePassword, deletePassword} from 'keytar';

import {Emitter} from 'atom';

export const UNAUTHENTICATED = Symbol('UNAUTHENTICATED');

// TOOD: Fall back to shelling out to `security` on unsigned-macOS builds
let instance = null;
export default class GithubLoginModel {
  static get() {
    if (!instance) {
      instance = new GithubLoginModel();
    }
    return instance;
  }

  constructor() {
    this.emitter = new Emitter();
  }

  getToken(account) {
    let password = getPassword('atom-github', account);
    if (!password) {
      // User is not logged in
      password = UNAUTHENTICATED;
    }
    return Promise.resolve(password);
  }

  setToken(account, token) {
    replacePassword('atom-github', account, token);
    this.didUpdate();
  }

  removeToken(account) {
    deletePassword('atom-github', account);
    this.didUpdate();
  }

  didUpdate() {
    this.emitter.emit('did-update');
  }

  onDidUpdate(cb) {
    return this.emitter.on('did-update', cb);
  }

  destroy() {
    this.emitter.dispose();
  }
}
