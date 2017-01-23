export default class ResolutionProgress {
  constructor(revision, savedState) {
    this.revision = revision;
    this.progressByPath = new Map();

    if (savedState.revision === this.revision) {
      Object.keys(savedState.paths || {}).forEach(path => {
        this.progressByPath.set(path, savedState.paths[path]);
      });
    }
  }

  reportMarkerCount(path, count) {
    if (!this.progressByPath.has(path)) {
      this.progressByPath.set(path, {
        value: 0,
        max: count,
      });
    }
  }

  markerWasResolved(path) {
    const existing = this.progressByPath.get(path);
    existing.value = Math.min(existing.max, existing.value + 1);
  }

  getValue(path) {
    const existing = this.progressByPath.get(path);
    return existing === undefined ? 0 : existing.value;
  }

  getMax(path) {
    const existing = this.progressByPath.get(path);
    return existing === undefined ? 1 : existing.max;
  }

  isEmpty() {
    return this.progressByPath.size === 0;
  }

  serialize() {
    const paths = Object.create(null);
    for (const [path, state] of this.progressByPath) {
      paths[path] = state;
    }

    return {revision: this.revision, paths};
  }
}
