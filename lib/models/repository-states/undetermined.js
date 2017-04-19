import State from './state';

export default class Undetermined extends State {
  start() {
    setTimeout(() => this.transitionTo('Absent'), 1000);
    return Promise.resolve();
  }

  isLoading() {
    return true;
  }
}

State.register(Undetermined);
