const NULL = Symbol('null');

export default class Search {
  constructor(name, query, attrs = {}) {
    this.name = name;
    this.query = query;
    this.attrs = attrs;
  }

  getName() {
    return this.name;
  }

  createQuery() {
    return this.query;
  }

  // A null search has insufficient information to construct a canned query, so it should always return no results.
  isNull() {
    return this.attrs[NULL] || false;
  }

  static forCurrentPR(remote, branch) {
    const name = 'Current pull request';

    const upstream = branch.getUpstream();
    if (!upstream.isRemoteTracking()) {
      return new this(name, '', {[NULL]: true});
    }

    return this.inRemote(remote, name, `type:pr head:${upstream.getShortRemoteRef()}`);
  }

  static inRemote(remote, name, query) {
    if (!remote.isGithubRepo()) {
      return new this(name, '', {[NULL]: true});
    }

    return new this(name, `repo:${remote.getOwner()}/${remote.getRepo()} ${query.trim()}`);
  }
}
