import State from './state';

export default class Initializing extends State {
  async start() {
    await this.git().init(this.workdir());

    await this.transitionTo('Loading');
  }
}

State.register(Initializing);
