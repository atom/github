/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import ChangedFilesCountView from '../views/changed-files-count-view'

export default class ChangedFilesCountController {
  constructor (props) {
    this.props = props
    this.switchRepository(props.repository)
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return this.switchRepository(props.repository)
  }

  render () {
    if (this.repository) {
      return (
        <ChangedFilesCountView
          ref='changedFilesCount'
          stagedChanges={this.stagedChanges}
          unstagedChanges={this.unstagedChanges}
          didClick={this.props.didClick} />
      )
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
      const stagedChanges = await repository.getStagedChanges()
      const unstagedChanges = await repository.getUnstagedChanges()
      this.unstagedChanges = unstagedChanges
      this.stagedChanges = stagedChanges
    }

    this.repository = repository
    return etch.update(this)
  }
}
