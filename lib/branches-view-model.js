/* @flow */

import GitStore from './git-store'

export default class BranchesViewModel {
  gitStore: GitStore;

  constructor (gitStore: GitStore) {
    this.gitStore = gitStore
  }

  createAndCheckoutBranch (name: string): Promise<void> {
    // TODO: Throw an error if the name is empty.

    return this.gitStore.createAndCheckoutBranch(name)
  }

  checkoutBranch (name: string): Promise<void> {
    return this.gitStore.checkoutBranch(name)
  }

  sanitizedBranchName (name: string): Promise<string> {
    return Promise.resolve(name.replace(/\s/g, '-'))
  }
}
