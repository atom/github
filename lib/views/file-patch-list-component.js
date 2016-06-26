/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

const uniquePatchId = (patch, component) => {
  return `a/${patch.getOldPath()} b/${patch.getNewPath()}`
}

export default class FilePatchListComponent {
  constructor ({filePatches, didSelectFilePatch, didConfirmFilePatch, selectedFilePatch}) {
    this.filePatches = filePatches
    this.selectedFilePatch = selectedFilePatch || filePatches[0]
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

  update ({filePatches, selectedFilePatch}) {
    this.filePatches = filePatches
    this.selectedFilePatch = selectedFilePatch || filePatches[0]
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-FileList'>
        {this.filePatches.map(filePatch => {
          const status = filePatch.getStatus()
          let path = filePatch.getDescriptionPath()
          const className = uniquePatchId(this.selectedFilePatch) === uniquePatchId(filePatch) ? 'is-selected' : ''
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

  destroy () {
    etch.destroy(this)
  }
}
