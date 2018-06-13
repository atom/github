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
    if (!remote.isPresent() || !remote.isGithubRepo() || !upstream.isRemoteTracking()) {
      return new this(name, '', {[NULL]: true});
    }

    return new this(name, `repo:${remote.getOwner()}/${remote.getRepo()} type:pr head:${upstream.getShortRemoteRef()}`);
  }

  static inRemote(remote, name, query) {
    if (!remote.isPresent()) {
      return new this(name, '', {[NULL]: true});
    }

    return new this(name, `repo:${remote.getOwner()}/${remote.getRepo()} ${query.trim()}`);
  }
}
