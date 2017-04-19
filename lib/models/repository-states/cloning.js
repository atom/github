import {mkdirs} from '../../helpers';

import State from './state';

export default class Cloning extends State {
  constructor(repository, remoteUrl) {
    super(repository);
    this.remoteUrl = remoteUrl;
  }

  async start() {
    await mkdirs(this.workdir());
    await this.git().clone(this.remoteUrl, {recursive: true});

    await this.transitionTo('Loading');
  }
}

State.register(Cloning);
