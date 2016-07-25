/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatch from '../models/file-patch'

export default class FilePatchListView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  didClickFilePatch (e, filePatchIndex) {
    const filePatch = this.props.filePatches[filePatchIndex]
    if (e.detail === 1) {
      this.didSelectFilePatch(filePatch)
    } else if (e.detail === 2) {
      this.props.toggleFilePatchStagingState(filePatch)
    }
  }

  didSelectFilePatch (filePatch) {
    this.props.didSelectFilePatch(filePatch)
    return etch.update(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-FilePatchListView'>
        {this.props.filePatches.map((filePatch, index) => {
          const status = filePatch.getStatus()
          const className = this.props.selectedFilePatchIndex === index ? 'is-selected' : ''
          return (
            <div className={`git-FilePatchListView-item is-${status} ${className}`} onclick={(e) => this.didClickFilePatch(e, index)}>
              <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
              <span className='git-FilePatchListView-path'>{filePatch.getDescriptionPath()}</span>
            </div>
          )
        })}
      </div>
    )
  }

  destroy () {
    etch.destroy(this)
  }
}
