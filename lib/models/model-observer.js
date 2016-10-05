/** @babel */

export default class RepositoryObserver {
  constructor ({fetchData}) {
    this.fetchData = fetchData
    this.activeModel = null
    this.activeModelData = null
    this.activeModelUpdateSubscription = null
  }

  async setActiveModel (model) {
    if (model !== this.activeModel) {
      if (this.activeModelUpdateSubscription) {
        this.activeModelUpdateSubscription.dispose()
        this.activeModelUpdateSubscription = null
      }
      this.activeModelUpdateSubscription = model.onDidUpdate(() => this.refreshModelData(model))
      await this.refreshModelData(model)
      this.activeModel = model
    }
  }

  async refreshModelData (model) {
    const fetchDataPromise = this.fetchData(model)
    this.lastFetchDataPromise = fetchDataPromise
    const modelData = await fetchDataPromise
    if (fetchDataPromise === this.lastFetchDataPromise) {
      this.activeModelData = modelData
    }
  }

  getActiveModel () {
    return this.activeModel
  }

  getActiveModelData () {
    return this.activeModelData
  }

  getLastFetchDataPromise () {
    return this.lastFetchDataPromise
  }
}
