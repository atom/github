import State from './state';

/**
 * Initial state to be used when it's uncertain whether or not a git repository is present in a working directory. If
 * it is a git repository, transition to Present, otherwise transition to Empty.
 */
export default class Loading extends State {
  async start() {
    if (await this.isGitRepository()) {
      const history = await this.loadHistoryPayload();
      return this.transitionTo('Present', history);
    } else {
      return this.transitionTo('Empty');
    }
  }

  isLoading() {
    return true;
  }

  async init() {
    await this.getLoadPromise();
    await this.repository.init();
  }

  async clone(remoteUrl) {
    await this.getLoadPromise();
    await this.repository.clone(remoteUrl);
  }

  showGitTabLoading() {
    return true;
  }

  directIsGitRepository() {
    return this.git().isGitRepository();
  }

  directGetConfig(key, options) {
    return this.git().getConfig(key, options);
  }

  directGetBlobContents(sha) {
    return this.git().getBlobContents(sha);
  }
}

State.register(Loading);
