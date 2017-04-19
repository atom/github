import State from './state';

const UNDETERMINED_TIMEOUT = 2000;

export default class Undetermined extends State {
  start() {
    setTimeout(() => this.transitionTo('Absent'), UNDETERMINED_TIMEOUT);
    return Promise.resolve();
  }

  isUndetermined() {
    return true;
  }

  showGitTabLoading() {
    return true;
  }
}

State.register(Undetermined);
