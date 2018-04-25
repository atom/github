import {Emitter} from 'event-kit';

import {UNAUTHENTICATED, createStrategy} from '../shared/keytar-strategy';

let instance = null;

export default class GithubLoginModel {
  static get() {
    if (!instance) {
      instance = new GithubLoginModel();
    }
    return instance;
  }

  constructor(Strategy) {
    this._Strategy = Strategy;
    this._strategy = null;
    this.emitter = new Emitter();
  }

  async getStrategy() {
    if (this._strategy) {
      return this._strategy;
    }

    if (this._Strategy) {
      this._strategy = new this._Strategy();
      return this._strategy;
    }

    this._strategy = await createStrategy();
    return this._strategy;
  }

  async getToken(account) {
    const strategy = await this.getStrategy();
    let password = await strategy.getPassword('atom-github', account);
    if (!password) {
      // User is not logged in
      password = UNAUTHENTICATED;
    }
    return password;
  }

  async setToken(account, token) {
    const strategy = await this.getStrategy();
    await strategy.replacePassword('atom-github', account, token);
    this.didUpdate();
  }

  async removeToken(account) {
    const strategy = await this.getStrategy();
    await strategy.deletePassword('atom-github', account);
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
