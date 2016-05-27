'use babel'

import keytar from 'keytar'

import {Emitter} from 'atom'

const KEYCHAIN_SERVICE_NAME = 'atom-github'
const KEYCHAIN_ACCOUNT = '_default'

export default class GitHubAuth {
  constructor () {
    this.emitter = new Emitter()
  }

  getToken () {
    return keytar.getPassword(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT)
  }

  setToken (token) {
    const tokenResult = keytar.replacePassword(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT, token)
    this.emitter.emit('did-set-token')
    return tokenResult
  }

  deleteToken () {
    const tokenResult = keytar.deletePassword(KEYCHAIN_SERVICE_NAME, KEYCHAIN_ACCOUNT)
    this.emitter.emit('did-delete-token')
    return tokenResult
  }

  onDidSetToken (callback) {
    return this.emitter.on('did-set-token', callback)
  }

  onDidDeleteToken (callback) {
    return this.emitter.on('did-delete-token', callback)
  }

  destroy () {
    this.emitter.dispose()
  }
}
