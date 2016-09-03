/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import ChangedFilesCountView from '../views/changed-files-count-view'
import RepositoryWatcher from './repository-watcher-controller'

export default class ChangedFilesCountController {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  destroy () {
    return etch.destroy(this)
  }

  render () {
    return (
      <RepositoryWatcher
        repository={this.props.repository}
        collectData={this.collectData}
      >
        <ChangedFilesCountView
          ref='changedFilesCount'
          didClick={this.props.didClick}
        />
      </RepositoryWatcher>
    )
  }

  async collectData (repository) {
    return {
      stagedChanges: await repository.getStagedChanges(),
      unstagedChanges: await repository.getUnstagedChanges()
    }
  }
}
