/** @babel */

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

export default class StagingArea {
  constructor (rawRepository) {
    this.rawRepository = rawRepository
  }

  // Exploring here... what the minimal direct Nodegit API interaction required
  // to determine modified, added, and deleted files? The code below doesn't
  // quite work.
  //
  // Once we query Git we should use that information to build our own
  // representation of the current status via a set of ChangedFile objects.
  // These objects will represent the difference between the working copy and
  // the HEAD of the repository and also maintain state about which lines have
  // been diffed. Eventually, we may need to get sophisticated about maintaining
  // ChangedFile objects across updates to the diff to maintain the user's
  // staging state across edits.
  async refresh () {
    let headCommit = await this.rawRepository.getHeadCommit()
    let headTree = await headCommit.getTree()
    let diff = await Git.Diff.treeToWorkdir(this.rawRepository)
    let patches = await await diff.patches()
    // hmmm... why is this empty
    console.log(patches);
  }
}
