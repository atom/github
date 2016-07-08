/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class FilePatchListView {
  constructor ({filePatches, didSelectFilePatch, toggleFilePatchStagingState, selectedFilePatchIndex}) {
    this.filePatches = filePatches
    this.selectedFilePatchIndex = selectedFilePatchIndex || 0
    this.didSelectFilePatch = didSelectFilePatch || function () {}
    this.toggleFilePatchStagingState = toggleFilePatchStagingState || function () {}

    etch.initialize(this)
  }

  didClickFilePatch (e, filePatchIndex) {
    const filePatch = this.filePatches[filePatchIndex]
    if (e.detail === 1) {
      this.didSelectFilePatch(filePatch)
    } else if (e.detail === 2) {
      this.toggleFilePatchStagingState(filePatch)
    }
  }

  didSelectFilePatch (filePatch) {
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
      <div className='git-FilePatchListView'>
        {this.filePatches.map((filePatch, index) => {
          const status = filePatch.getStatus()
          let path = filePatch.getDescriptionPath()
          const className = this.selectedFilePatchIndex === index ? 'is-selected' : ''
          return (
            <div className={`git-FilePatchListView-item is-${status} ${className}`} onclick={(e) => this.didClickFilePatch(e, index)}>
              <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
              <span className='git-FilePatchListView-path'>{path}</span>
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
