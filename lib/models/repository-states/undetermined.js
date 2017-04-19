import State from './state';

export default class Undetermined extends State {
  start() {
    setTimeout(() => this.transitionTo('Absent'), 1000);
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
