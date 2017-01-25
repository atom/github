import {getPassword, replacePassword, deletePassword} from 'keytar';

import {Emitter} from 'atom';

// TOOD: Fall back to shelling out to `security` on unsigned-macOS builds
export default class GithubLoginModel {
  constructor() {
    this.emitter = new Emitter();
  }

  getToken(account) {
    return Promise.resolve(getPassword('atom-github', account));
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
    this.emitter.destroy();
  }
}
