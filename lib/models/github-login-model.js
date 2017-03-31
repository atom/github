import {execFile} from 'child_process';

import keytar from 'keytar';

import {Emitter} from 'atom';

export const UNAUTHENTICATED = Symbol('UNAUTHENTICATED');

export class KeytarStrategy {
  static isValid() {
    const rand = Math.floor(Math.random() * 10e20).toString(16);
    keytar.replacePassword('atom-test-service', rand, rand);
    const pass = keytar.getPassword('atom-test-service', rand);
    const success = pass === rand;
    keytar.deletePassword('atom-test-service', rand);
    return success;
  }

  getPassword(service, account) {
    return keytar.getPassword(service, account);
  }

  replacePassword(service, account, password) {
    return keytar.replacePassword(service, account, password);
  }

  deletePassword(service, account) {
    return keytar.deletePassword(service, account);
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
    // eslint-disable-next-line no-console
    console.warn(
      'Using an InMemoryStrategy strategy for storing tokens. ' +
      'The tokens will only be stored for the current window.',
    );
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
const strategies = [KeytarStrategy, SecurityBinaryStrategy];
export default class GithubLoginModel {
  static get() {
    if (!instance) {
      instance = new GithubLoginModel();
    }
    return instance;
  }

  constructor(Strategy = strategies.find(strat => strat.isValid())) {
    this.emitter = new Emitter();
    if (!Strategy) {
      throw new Error('None of the listed GithubLoginModel strategies returned true for `isValid`');
    }
    this.strategy = new Strategy();
  }

  async getToken(account) {
    let password = await this.strategy.getPassword('atom-github', account);
    if (!password) {
      // User is not logged in
      password = UNAUTHENTICATED;
    }
    return password;
  }

  async setToken(account, token) {
    await this.strategy.replacePassword('atom-github', account, token);
    this.didUpdate();
  }

  async removeToken(account) {
    await this.strategy.deletePassword('atom-github', account);
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
