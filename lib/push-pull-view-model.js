/* @flow */

import GitService from './git-service'
import {findFirst} from './common'

export default class PushPullViewModel {
  gitService: GitService;

  constructor (gitService: GitService) {
    this.gitService = gitService
  }

  async fetch (): Promise<void> {
    const remote = await this.getDefaultRemote()
    if (!remote) return Promise.resolve()

    return this.gitService.fetch(remote, {username: 'me', password: 'yo'}, progress => {
      console.log('progress fetching', progress)
    })
  }

  pull (): Promise<void> {
    return Promise.resolve()
  }

  async push (): Promise<void> {
    const remote = await this.getDefaultRemote()
    if (!remote) return Promise.resolve()

    return this.gitService.push(remote, {username: 'me', password: 'yo'}, progress => {
      console.log('progress pushing', progress)
    })
  }

  async getDefaultRemote (): Promise<?string> {
    const remotes = await this.gitService.getRemotes()
    if (!remotes.length) return Promise.resolve(null)

    let remote = findFirst(remotes, remote => remote === 'origin')
    if (!remote) return remote

    return remotes[0]
  }
}
