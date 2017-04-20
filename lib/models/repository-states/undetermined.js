import State from './state';

export default class Undetermined extends State {
  constructor(repository, loadingLike) {
    super(repository);

    this.loadingLike = loadingLike;
  }

  isUndetermined() {
    return true;
  }

  showGitTabLoading() {
    return this.loadingLike;
  }

  showGitTabInit() {
    return !this.loadingLike;
  }

  hasDirectory() {
    return false;
  }
}

State.register(Undetermined);
