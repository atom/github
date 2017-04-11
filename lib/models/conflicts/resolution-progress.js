import {Emitter} from 'event-kit';

export default class ResolutionProgress {
  static empty() {
    return new ResolutionProgress('', {});
  }

  constructor(revision, savedState) {
    this.emitter = new Emitter();

    this.revision = revision;
    this.markerCountByPath = new Map();

    if (savedState.revision === this.revision) {
      Object.keys(savedState.paths || {}).forEach(path => {
        this.markerCountByPath.set(path, savedState.paths[path]);
      });
    }
  }

  didUpdate() {
    this.emitter.emit('did-update');
  }

  onDidUpdate(cb) {
    return this.emitter.on('did-update', cb);
  }

  reportMarkerCount(path, count) {
    const previous = this.markerCountByPath.get(path);
    this.markerCountByPath.set(path, count);
    if (count !== previous) {
      this.didUpdate();
    }
  }

  getRemaining(path) {
    return this.markerCountByPath.get(path);
  }

  isEmpty() {
    return this.markerCountByPath.size === 0;
  }

  serialize() {
    const paths = Object.create(null);
    for (const [path, count] of this.markerCountByPath) {
      paths[path] = count;
    }

    return {revision: this.revision, paths};
  }
}
