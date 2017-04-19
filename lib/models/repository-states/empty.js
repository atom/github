import State from './state';

export default class Empty extends State {
  isEmpty() {
    return true;
  }

  init() {
    return this.transitionTo('Initializing');
  }

  clone(remoteUrl) {
    return this.transitionTo('Cloning', remoteUrl);
  }

  }
}

State.register(Empty);
