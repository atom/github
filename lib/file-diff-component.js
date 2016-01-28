/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DiffHunkComponent from './diff-hunk-component'

export default class FileDiffComponent {
  constructor ({fileDiff, fileIndex, diffViewModel}) {
    this.fileIndex = fileIndex
    this.fileDiff = fileDiff
    this.diffViewModel = diffViewModel
    etch.createElement(this)
    this.element.component = this
  }

  render () {
    return (
      <div className="git-file-diff">
        <div className="patch-description">
          {this.getIconForFileDiff(this.fileDiff)}
          <span className="text">
            <strong className="path">{this.fileDiff.getNewPathName()}</strong>
          </span>
        </div>
        {this.fileDiff.getHunks().map((diffHunk, index) =>
          <DiffHunkComponent diffHunk={diffHunk} fileIndex={this.fileIndex} hunkIndex={index} diffViewModel={this.diffViewModel}/>
        )}
      </div>
    )
  }

  getIconForFileDiff(fileDiff) {
    let changeStatus = fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
