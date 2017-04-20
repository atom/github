import {Emitter} from 'event-kit';

export default class ResolutionProgress {
  constructor() {
    this.emitter = new Emitter();

    this.revision = '';
    this.markerCountByPath = new Map();
    this.loaded = false;
  }

  load(revision, savedState) {
    this.revision = revision;

    if (savedState.revision === this.revision) {
      const paths = Object.keys(savedState.paths || {});
      paths.forEach(filePath => {
        this.markerCountByPath.set(filePath, savedState.paths[filePath]);
      });

      if (paths.length > 0) {
        this.didUpdate();
      }
    }

    this.loaded = true;
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
