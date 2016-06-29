/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class FilePatchListView {
  constructor ({filePatches, didSelectFilePatch, didConfirmFilePatch, selectedFilePatchIndex}) {
    this.filePatches = filePatches
    this.selectedFilePatchIndex = selectedFilePatchIndex || 0
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.didConfirmFilePatch = didConfirmFilePatch || function () {}

    etch.initialize(this)
  }

  didClickFilePatch (e, filePatchIndex) {
    const filePatch = this.filePatches[filePatchIndex]
    if (e.detail === 1) {
      this.selectFilePatch(filePatch)
    } else if (e.detail === 2) {
      this.didConfirmFilePatch(filePatch)
    }
  }

  selectFilePatch (filePatch) {
    this.didSelectFilePatch(filePatch)
    return etch.update(this)
  }

  update ({filePatches, selectedFilePatchIndex}) {
    this.filePatches = filePatches
    this.selectedFilePatchIndex = selectedFilePatchIndex || 0
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-FileList'>
        {this.filePatches.map((filePatch, index) => {
          const status = filePatch.getStatus()
          let path = filePatch.getDescriptionPath()
          const className = this.selectedFilePatchIndex === index ? 'is-selected' : ''
          return (
            <div className={`git-FilePatchListItem ${status} ${className}`} onclick={(e) => this.didClickFilePatch(e, index)}>
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
