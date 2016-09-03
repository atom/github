/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class RepositoryWatcher {
  constructor (props, children) {
    this.props = props
    this.children = children
    this.switchRepository(props.repository)
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return this.switchRepository(props.repository)
  }

  render () {
    if (this.repository) {
      return etch.cloneElement(this.children[0], this.data)
    } else {
      return <div />
    }
  }

  destroy () {
    if (this.repositorySubscription) this.repositorySubscription.dispose()
    return etch.destroy(this)
  }

  switchRepository (repository) {
    if (repository !== this.repository) {
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.repositorySubscription = repository.onDidUpdate(() => this.refreshModelData(repository))
      }

      return this.refreshModelData(repository)
    }
  }

  refreshModelData (repository) {
    this.lastModelDataRefreshPromise = this._refreshModelData(repository)
    return this.lastModelDataRefreshPromise
  }

  async _refreshModelData (repository) {
    if (repository) {
      this.data = await this.props.collectData(repository)
    }
    this.repository = repository
    return etch.update(this)
  }
}
