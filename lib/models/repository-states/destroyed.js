import State from './state';

export default class Destroyed extends State {
  start() {
    this.didDestroy();
    this.repository.emitter.dispose();
  }

  isDestroyed() {
    return true;
  }

  destroy() {
    // No-op to destroy twice
  }
}
