import State from './state';
import Loading from './loading';

export default class Initializing extends Loading {
  async start() {
    await this.git().init(this.workdir());

    // See https://github.com/babel/babel/issues/3930
    await Loading.prototype.start.call(this);
  }
}

State.register(Initializing);
