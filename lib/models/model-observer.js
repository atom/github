/** @babel */

export default class ModelObserver {
  constructor({fetchData, didUpdate}) {
    this.fetchData = fetchData || (() => {});
    this.didUpdate = didUpdate || (() => {});
    this.activeModel = null;
    this.activeModelData = null;
    this.activeModelUpdateSubscription = null;
  }

  setActiveModel(model) {
    if (model !== this.activeModel) {
      if (this.activeModelUpdateSubscription) {
        this.activeModelUpdateSubscription.dispose();
        this.activeModelUpdateSubscription = null;
      }
      this.activeModel = model;
      this.activeModelData = null;
      this.didUpdate(model);
      if (model) {
        this.activeModelUpdateSubscription = model.onDidUpdate(() => this.refreshModelData(model));
        return this.refreshModelData(model);
      }
    }
    return null;
  }

  refreshModelData(model = this.activeModel) {
    this.lastModelDataRefreshPromise = this._refreshModelData(model);
    return this.lastModelDataRefreshPromise;
  }

  async _refreshModelData(model) {
    const fetchDataPromise = this.fetchData(model);
    this.lastFetchDataPromise = fetchDataPromise;
    const modelData = await fetchDataPromise;
    if (fetchDataPromise === this.lastFetchDataPromise) {
      this.activeModel = model;
      this.activeModelData = modelData;
      await this.didUpdate(model);
    }
  }

  getActiveModel() {
    return this.activeModel;
  }

  getActiveModelData() {
    return this.activeModelData;
  }

  getLastModelDataRefreshPromise() {
    return this.lastModelDataRefreshPromise;
  }

  destroy() {
    if (this.activeModelUpdateSubscription) { this.activeModelUpdateSubscription.dispose(); }
  }
}
