import {mkdirs} from '../../helpers';

import State from './state';
import Loading from './loading';

export default class Cloning extends Loading {
  constructor(repository, remoteUrl) {
    super(repository);
    this.remoteUrl = remoteUrl;
  }

  async start() {
    await mkdirs(this.workdir());
    await this.git().clone(this.remoteUrl, {recursive: true});

    // See https://github.com/babel/babel/issues/3930
    await Loading.prototype.start.call(this);
  }
}

State.register(Cloning);
