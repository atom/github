/* @flow */

import GitStore from './git-store'
import GitService from './git-service'

export default class PushPullViewModel {
  gitStore: GitStore;
  gitService: GitService;
  token: ?string;

  constructor (gitStore: GitStore) {
    this.gitStore = gitStore
    this.gitService = gitStore.getGitService()
  }

  async fetch (): Promise<void> {
    const remotes = await this.gitService.getRemotes()
    // TODO: These credentials almost certainly won't be right on all remotes,
    // but let's roll with this for now.
    const creds = this.getCreds()
    // Gotta fetch 'em all!
    for (const remote of remotes) {
      await this.gitService.fetch(remote, creds, progress => {
        console.log('fetch progress', progress)
      })
    }
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

  getCreds (): {username: string, password: string} {
    return {username: this.token || '', password: 'x-oauth-basic'}
  }

  setToken (t: string) {
    this.token = t
  }
}
