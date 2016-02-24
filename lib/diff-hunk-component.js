/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowBug: Yes, we know this isn't a React component :\
import HunkLineComponent from './hunk-line-component'

import type DiffHunk from './diff-hunk'
import type DiffViewModel from './diff-view-model'

export default class DiffHunkComponent {
  diffHunk: DiffHunk;
  diffViewModel: DiffViewModel;
  fileIndex: number;
  hunkIndex: number;
  element: HTMLElement;
  mouseDownAction: Function;
  mouseUpAction: Function;
  mouseMovedAction: Function;

  constructor ({diffHunk, fileIndex, hunkIndex, diffViewModel, mouseDownAction, mouseUpAction, mouseMovedAction}: {diffHunk: DiffHunk, fileIndex: number, hunkIndex: number, diffViewModel: DiffViewModel, mouseDownAction: Function, mouseUpAction: Function, mouseMovedAction: Function}) {
    this.diffHunk = diffHunk
    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.diffViewModel = diffViewModel
    this.mouseDownAction = mouseDownAction
    this.mouseUpAction = mouseUpAction
    this.mouseMovedAction = mouseMovedAction

    etch.createElement(this)
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
            mouseDownAction={this.mouseDownAction}
            mouseUpAction={this.mouseUpAction}
            mouseMovedAction={this.mouseMovedAction}
          />
        )}
      </div>
    )
  }
}
