/* @flow */

import GitService from './git-service'

export default class PushPullViewModel {
  gitService: GitService;

  constructor (gitService: GitService) {
    this.gitService = gitService
  }

  fetch (): Promise<void> {
    return Promise.resolve()
  }

  pull (): Promise<void> {
    return Promise.resolve()
  }

  push (): Promise<void> {
    return Promise.resolve()
  }
}
