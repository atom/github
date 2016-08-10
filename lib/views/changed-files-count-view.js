/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class ChangedFilesCountView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return etch.update(this)
  }

  render () {
    const changedFilesCount = this.getChangedFilesCount()
    if (changedFilesCount === 0) {
      return <a style={{display: 'none'}} />
    } else {
      const label = changedFilesCount === 1 ? '1 file' : `${changedFilesCount} files`
      return (
        <a
          ref='changedFiles'
          className='inline-block icon icon-diff'
          onclick={this.props.didClick}>{label}</a>
      )
    }
  }

  getChangedFilesCount () {
    const changedFiles = new Set()
    for (let filePatch of this.props.unstagedChanges) {
      changedFiles.add(filePatch.getPath())
    }
    for (let filePatch of this.props.stagedChanges) {
      changedFiles.add(filePatch.getPath())
    }
    return changedFiles.size
  }
}
