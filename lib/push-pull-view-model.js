/* @flow */

import GitStore from './git-store'
import GitService from './git-service'
import {findFirst} from './common'

export default class PushPullViewModel {
  gitStore: GitStore;
  gitService: GitService;

  constructor (gitStore: GitStore) {
    this.gitStore = gitStore
    this.gitService = gitStore.getGitService()
  }

  async fetch (): Promise<void> {
    const remote = await this.getDefaultRemote()
    if (!remote) return Promise.resolve()

    return this.gitService.fetch(remote, this.getCreds(), progress => {
      console.log('fetch progress', progress)
    })
  }

  pull (): Promise<void> {
    return this.gitService.pull(this.gitStore.branchName, this.getCreds(), progress => {
      console.log('pull progress', progress)
    })
  }

  push (): Promise<void> {
    // TODO: Support pushing a new branch.

    return this.gitService.push(this.gitStore.branchName, this.getCreds(), progress => {
      console.log('push progress', progress)
    })
  }

  async getDefaultRemote (): Promise<?string> {
    const remotes = await this.gitService.getRemotes()
    if (!remotes.length) return Promise.resolve(null)

    let remote = findFirst(remotes, remote => remote === 'origin')
    if (!remote) return remote

    return remotes[0]
  }

  getCreds (): {username: string, password: string} {
    return {username: 'me', password: 'yo'}
  }
}
