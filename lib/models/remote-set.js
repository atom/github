import {nullRemote} from './remote';

export default class RemoteSet {
  constructor(iterable = []) {
    this.byName = new Map();
    for (const remote of iterable) {
      this.add(remote);
    }
  }

  add(remote) {
    this.byName.set(remote.getName(), remote);
  }

  isEmpty() {
    return this.byName.size === 0;
  }

  size() {
    return this.byName.size;
  }

  withName(name) {
    return this.byName.get(name) || nullRemote;
  }

  [Symbol.iterator]() {
    return this.byName.values();
  }

  filter(predicate) {
    return new this.constructor(
      Array.from(this).filter(predicate),
    );
  }
}
