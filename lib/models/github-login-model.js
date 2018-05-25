import crypto from 'crypto';
import {Emitter} from 'event-kit';

import {UNAUTHENTICATED, INSUFFICIENT, createStrategy} from '../shared/keytar-strategy';

let instance = null;

export default class GithubLoginModel {
  // Be sure that we're requesting at least this many scopes on the token we grant through github.atom.io or we'll
  // give everyone a really frustrating experience ;-)
  static REQUIRED_SCOPES = ['repo', 'read:org', 'user:email']

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
    this.checked = new Set();
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
    const password = await strategy.getPassword('atom-github', account);
    if (!password) {
      // User is not logged in
      return UNAUTHENTICATED;
    }

    if (/^https?:\/\//.test(account)) {
      // Avoid storing tokens in memory longer than necessary. Let's cache token scope checks by storing a set of
      // checksums instead.
      const hash = crypto.createHash('md5');
      hash.update(password);
      const fingerprint = hash.digest('base64');

      if (!this.checked.has(fingerprint)) {
        try {
          const scopes = new Set(await this.getScopes(account, password));

          for (const scope of this.constructor.REQUIRED_SCOPES) {
            if (!scopes.has(scope)) {
              // Token doesn't have enough OAuth scopes, need to reauthenticate
              return INSUFFICIENT;
            }
          }

          // We're good
          this.checked.add(fingerprint);
        } catch (e) {
          // Bad credential most likely
          // eslint-disable-next-line no-console
          console.error(`Unable to validate token scopes against ${account}`, e);
          return UNAUTHENTICATED;
        }
      }
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

  async getScopes(host, token) {
    if (atom.inSpecMode()) {
      throw new Error('Attempt to check token scopes in specs');
    }

    const response = await fetch(host, {
      method: 'HEAD',
      headers: {Authorization: `bearer ${token}`},
    });

    if (response.status !== 200) {
      throw new Error(`Unable to check token for OAuth scopes against ${host}: ${await response.text()}`);
    }

    return response.headers.get('X-OAuth-Scopes').split(/\s*,\s*/);
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
