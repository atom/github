import State from './state';

export default class LoadingGuess extends State {
  isLoadingGuess() {
    return true;
  }

  isUndetermined() {
    return true;
  }

  showGitTabLoading() {
    return true;
  }

  showGitTabInit() {
    return false;
  }

  hasDirectory() {
    return false;
  }
}

State.register(LoadingGuess);
