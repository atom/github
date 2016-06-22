/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class FileDiffListComponent {
  constructor ({fileDiffs, selectedFileDiff, onFileDiffClick, onFileDiffDoubleClick}) {
    this.fileDiffs = fileDiffs
    this.selectedFileDiff = selectedFileDiff
    this.onFileDiffClick = onFileDiffClick
    this.onFileDiffDoubleClick = onFileDiffDoubleClick

    etch.initialize(this)
  }

  didClickFileDiff (e, fileDiff) {
    if (e.detail === 1) {
      this.onFileDiffClick(fileDiff)
    } else if (e.detail === 2) {
      this.onFileDiffDoubleClick(fileDiff)
    }
  }

  update ({selectedFileDiff, fileDiffs}) {
    this.selectedFileDiff = selectedFileDiff
    this.fileDiffs = fileDiffs
    etch.update(this)
  }

  destroy () {
    etch.destroy(this)
  }

  render () {
    return (
      <div className='git-FileList'>
        {this.fileDiffs.map(fileDiff => {
          const status = fileDiff.getStatus()
          let path
          if (status === 'renamed') {
            path = `${fileDiff.getOldPath()} → ${fileDiff.getNewPath()}`
          } else if (status === 'added') {
            path = fileDiff.getNewPath()
          } else if (status === 'removed' || status === 'modified') {
            path = fileDiff.getOldPath()
          }
          const className = this.selectedFileDiff === fileDiff ? 'is-selected' : ''
          return (
            <div className={`git-FileDiff ${status} ${className}`} onclick={(e) => this.didClickFileDiff(e, fileDiff)}>
              <span className={`git-FileDiff-icon icon icon-diff-${status} status-${status}`} />
              <span className='git-FileDiff-path'>{path}</span>
            </div>
          )
        })}
      </div>
    )
  }
}
