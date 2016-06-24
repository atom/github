/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class FilePatchListComponent {
  constructor ({fileDiffs, didSelectFilePatch, didConfirmFilePatch}) {
    this.fileDiffs = fileDiffs
    this.selectedFilePatch = fileDiffs[0]
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.didConfirmFilePatch = didConfirmFilePatch || function () {}

    etch.initialize(this)
  }

  didClickFilePatch (e, filePatch) {
    if (e.detail === 1) {
      this.selectFilePatch(filePatch)
    } else if (e.detail === 2) {
      this.didConfirmFilePatch(filePatch)
    }
  }

  selectFilePatch (filePatch) {
    this.selectedFilePatch = filePatch
    this.didSelectFilePatch(filePatch)
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
        {this.fileDiffs.map(filePatch => {
          const status = filePatch.getStatus()
          let path = filePatch.getDescriptionPath()
          const className = this.selectedFilePatch === filePatch ? 'is-selected' : ''
          return (
            <div className={`git-FilePatchListItem ${status} ${className}`} onclick={(e) => this.didClickFilePatch(e, filePatch)}>
              <span className={`git-FilePatchListItem-icon icon icon-diff-${status} status-${status}`} />
              <span className='git-FilePatchListItem-path'>{path}</span>
            </div>
          )
        })}
      </div>
    )
  }
}
