/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import HunkLineComponent from './hunk-line-component'

export default class DiffHunkComponent {
  constructor ({diffHunk, fileIndex, hunkIndex, diffViewModel}) {
    this.diffHunk = diffHunk
    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.diffViewModel = diffViewModel
    etch.createElement(this)
    this.element.component = this
  }

  render () {
    return (
      <div className="git-diff-hunk">
        <div className="git-hunk-line diff-hunk-header">
          <div className="old-line-number"></div>
          <div className="new-line-number"></div>
          <div className="diff-hunk-data">
            {this.diffHunk.getHeader()}
          </div>
        </div>
        {this.diffHunk.getLines().map((hunkLine, index) =>
          <HunkLineComponent
            hunkLine={hunkLine}
            selected={this.diffViewModel.isLineSelected(this.fileIndex, this.hunkIndex, index)}
            fileIndex={this.fileIndex}
            hunkIndex={this.hunkIndex}
            lineIndex={index}
          />
        )}
      </div>
    )
  }
}
