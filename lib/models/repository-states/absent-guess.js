import State from './state';

export default class AbsentGuess extends State {
  isAbsentGuess() {
    return true;
  }

  isUndetermined() {
    return true;
  }

  showGitTabLoading() {
    return false;
  }

  showGitTabInit() {
    return true;
  }

  hasDirectory() {
    return false;
  }
}

State.register(AbsentGuess);
