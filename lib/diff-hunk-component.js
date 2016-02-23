/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowFixMe: Yes, we know this isn't a React component :\
import HunkLineComponent from './hunk-line-component'

import type DiffHunk from './diff-hunk'
import type DiffViewModel from './diff-view-model'
import type {EtchElement} from './common'

// type EtchElement<T> = HTMLElement & {component: T}

export default class DiffHunkComponent {
  diffHunk: DiffHunk;
  diffViewModel: DiffViewModel;
  fileIndex: number;
  hunkIndex: number;
  element: EtchElement<DiffHunkComponent>;

  constructor ({diffHunk, fileIndex, hunkIndex, diffViewModel}: {diffHunk: DiffHunk, fileIndex: number, hunkIndex: number, diffViewModel: DiffViewModel}) {
    this.diffHunk = diffHunk
    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.diffViewModel = diffViewModel
    etch.createElement(this)
    this.element.component = this
  }

  render () {
    return (
      <div className='git-diff-hunk'>
        <div className='git-hunk-line diff-hunk-header'>
          <div className='old-line-number'></div>
          <div className='new-line-number'></div>
          <div className='diff-hunk-data'>
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
