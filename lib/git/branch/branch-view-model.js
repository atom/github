/* @flow */

import GitStore from '../git-store'

export default class BranchViewModel {
  gitStore: GitStore;

  static NoNameErrorName () {
    return 'BranchViewModel.noName'
  }

  constructor (gitStore: GitStore) {
    this.gitStore = gitStore
  }

  createAndCheckoutBranch (name: string): Promise<void> {
    if (!name.length) {
      const error = new Error('Give the new branch a name.')
      error.name = BranchViewModel.NoNameErrorName()
      return Promise.reject(error)
    }

    return this.gitStore.createAndCheckoutBranch(name)
  }

  checkoutBranch (name: string): Promise<void> {
    return this.gitStore.checkoutBranch(name)
  }

  sanitizedBranchName (name: string): Promise<string> {
    return Promise.resolve(name.replace(/\s/g, '-'))
  }
}
