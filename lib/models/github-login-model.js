import {execFile} from 'child_process';

import {Emitter} from 'event-kit';

export const UNAUTHENTICATED = Symbol('UNAUTHENTICATED');

export class KeytarStrategy {
  static get keytar() {
    return require('keytar');
  }

  static async isValid() {
    // Allow for disabling Keytar on problematic CI environments
    if (process.env.ATOM_GITHUB_DISABLE_KEYTAR) {
      return false;
    }

    const keytar = this.keytar;

    try {
      const rand = Math.floor(Math.random() * 10e20).toString(16);
      await keytar.setPassword('atom-test-service', rand, rand);
      const pass = await keytar.getPassword('atom-test-service', rand);
      const success = pass === rand;
      keytar.deletePassword('atom-test-service', rand);
      return success;
    } catch (err) {
      return false;
    }
  }

  getPassword(service, account) {
    return this.constructor.keytar.getPassword(service, account);
  }

  replacePassword(service, account, password) {
    return this.constructor.keytar.setPassword(service, account, password);
  }

  deletePassword(service, account) {
    return this.constructor.keytar.deletePassword(service, account);
  }
}

export class SecurityBinaryStrategy {
  static isValid() {
    return process.platform === 'darwin';
  }

  async getPassword(service, account) {
    try {
      const password = await this.exec(['find-generic-password', '-s', service, '-a', account, '-w']);
      return password.trim() || UNAUTHENTICATED;
    } catch (err) {
      return UNAUTHENTICATED;
    }
  }

  replacePassword(service, account, newPassword) {
    return this.exec(['add-generic-password', '-s', service, '-a', account, '-w', newPassword, '-U']);
  }

  deletePassword(service, account) {
    return this.exec(['delete-generic-password', '-s', service, '-a', account]);
  }

  exec(securityArgs, {binary} = {binary: 'security'}) {
    return new Promise((resolve, reject) => {
      execFile(binary, securityArgs, (error, stdout) => {
        if (error) { return reject(error); }
        return resolve(stdout);
      });
    });
  }
}

export class InMemoryStrategy {
  static isValid() {
    return true;
  }

  constructor() {
    if (!atom.inSpecMode()) {
      // eslint-disable-next-line no-console
      console.warn(
        'Using an InMemoryStrategy strategy for storing tokens. ' +
        'The tokens will only be stored for the current window.',
      );
    }
    this.passwordsByService = new Map();
  }

  getPassword(service, account) {
    const passwords = this.passwordsByService.get(service) || new Map();
    const password = passwords.get(account);
    return password || UNAUTHENTICATED;
  }

  replacePassword(service, account, newPassword) {
    const passwords = this.passwordsByService.get(service) || new Map();
    passwords.set(account, newPassword);
    this.passwordsByService.set(service, passwords);
  }

  deletePassword(service, account) {
    const passwords = this.passwordsByService.get(service);
    if (passwords) {
      passwords.delete(account);
    }
  }
}

let instance = null;
const strategies = [KeytarStrategy, SecurityBinaryStrategy, InMemoryStrategy];
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

    let Strategy;
    for (let i = 0; i < strategies.length; i++) {
      const strat = strategies[i];
      const isValid = await strat.isValid();
      if (isValid) {
        Strategy = strat;
        break;
      }
    }
    // const Strategy = this._Strategy || strategies.find(strat => strat.isValid());
    if (!Strategy) {
      throw new Error('None of the listed GithubLoginModel strategies returned true for `isValid`');
    }
    this._strategy = new Strategy();
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
