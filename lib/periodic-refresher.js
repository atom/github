import {autobind} from 'core-decorators';

const refreshMapPerUniqueId = new WeakMap();

export default class PeriodicRefresher {
  static getRefreshMap(uniqueId) {
    let refreshMap = refreshMapPerUniqueId.get(uniqueId);
    if (!refreshMap) {
      refreshMap = new Map();
      refreshMapPerUniqueId.set(uniqueId, refreshMap);
    }

    return refreshMap;
  }

  constructor(uniqueId, options) {
    this.options = options;
    this._refreshesPerId = PeriodicRefresher.getRefreshMap(uniqueId);
  }

  start() {
    if (!this._timer) {
      this.scheduleNext();
    }
  }

  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      delete this._timer;
    }
  }

  scheduleNext() {
    this._timer = setTimeout(this.tick, this.options.interval());
  }

  @autobind
  tick() {
    const currentId = this.options.getCurrentId();
    const lastRefreshForId = this._refreshesPerId.get(currentId) || 0;
    const delta = performance.now() - lastRefreshForId;
    if (delta > this.options.minimumIntervalPerId) {
      this._refreshesPerId.set(currentId, performance.now());
      this.options.refresh();
    }
    this.scheduleNext();
  }

  refresh() {
    this._callback();
  }

  destroy() {
    this.stop();
  }
}
