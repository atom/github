import {nullBranch} from './branch';

function pushAtKey(map, key, value) {
  let existing = map.get(key);
  if (!existing) {
    existing = [];
    map.set(key, existing);
  }
  existing.push(value);
}

// Store and index a set of Branches in a repository.
export default class BranchSet {
  constructor() {
    this.all = [];
    this.head = nullBranch;
    this.byUpstreamRef = new Map();
    this.byPushRef = new Map();
  }

  add(branch) {
    this.all.push(branch);

    if (branch.isHead()) {
      this.head = branch;
    }

    const u = branch.getUpstream();
    if (u.isPresent()) {
      pushAtKey(this.byUpstreamRef, u.getRemoteRef(), branch);
    }

    const p = branch.getPush();
    if (p.isPresent()) {
      pushAtKey(this.byPushRef, p.getRemoteRef(), branch);
    }
  }

  // Return the HEAD branch, or `nullBranch` if HEAD is not a branch. This can happen if HEAD is unborn (the repository
  // was just initialized) or if HEAD is detached.
  getHeadBranch() {
    return this.head;
  }

  // Return an Array of Branches that would be updated from a given remote ref with a `git pull`. This corresponds with
  // git's notion of an _upstream_ and takes into account the current `branch.remote` setting and `remote.<name>.fetch`
  // refspec.
  getPullTargets(remoteRefName) {
    return this.byUpstreamRef.get(remoteRefName) || [];
  }

  // Return an Array of Branches that will update a given remote ref on an unqualified `git push`. This accounts for
  // the current `branch.pushRemote` setting and `remote.<name>.push` refspec.
  getPushSources(remoteRefName) {
    return this.byPushRef.get(remoteRefName) || [];
  }
}
