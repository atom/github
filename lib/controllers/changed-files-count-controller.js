/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import ChangedFilesCountView from '../views/changed-files-count-view'
import RepositoryWatcher from './repository-watcher-controller'

export default class ChangedFilesCountController {
  constructor (props) {
    this.props = props
    window.c = this
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    console.log('update', this.props.repository);
    return etch.update(this)
  }

  destroy () {
    return etch.destroy(this)
  }

  render () {
    return (
      <RepositoryWatcher
        ref='changedFilesCountWatcher'
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

  readAfterUpdate () {
    console.log(this.props.repository, this.refs);
  }

  async collectData (repository) {
    return {
      stagedChanges: await repository.getStagedChanges(),
      unstagedChanges: await repository.getUnstagedChanges()
    }
  }
}
