/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class FileDiffListComponent {
  constructor ({fileDiffs, didSelectFileDiff, didConfirmFileDiff}) {
    this.fileDiffs = fileDiffs
    this.selectedFileDiff = fileDiffs[0]
    this.didSelectFileDiff = didSelectFileDiff || function () {}
    this.didConfirmFileDiff = didConfirmFileDiff || function () {}

    etch.initialize(this)
  }

  didClickFileDiff (e, fileDiff) {
    if (e.detail === 1) {
      this.selectFileDiff(fileDiff)
    } else if (e.detail === 2) {
      this.didConfirmFileDiff(fileDiff)
    }
  }

  selectFileDiff (fileDiff) {
    this.selectedFileDiff = fileDiff
    this.didSelectFileDiff(fileDiff)
    return etch.update(this)
  }

  update ({fileDiffs}) {
    this.fileDiffs = fileDiffs
    return etch.update(this)
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
            <div className={`git-FileDiffListItem ${status} ${className}`} onclick={(e) => this.didClickFileDiff(e, fileDiff)}>
              <span className={`git-FileDiffListItem-icon icon icon-diff-${status} status-${status}`} />
              <span className='git-FileDiffListItem-path'>{path}</span>
            </div>
          )
        })}
      </div>
    )
  }
}
