/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowBug: Yes, we know this isn't a React component :\
import HunkLineComponent from './hunk-line-component'

import type DiffHunk from './diff-hunk'
import type DiffViewModel from './diff-view-model'

type DiffHunkComponentProps = {diffHunk: DiffHunk, fileIndex: number, hunkIndex: number, diffViewModel: DiffViewModel, mouseDownAction: Function, mouseUpAction: Function, mouseMovedAction: Function}

export default class DiffHunkComponent {
  diffHunk: DiffHunk;
  diffViewModel: DiffViewModel;
  fileIndex: number;
  hunkIndex: number;
  element: HTMLElement;
  mouseDownAction: Function;
  mouseUpAction: Function;
  mouseMovedAction: Function;

  constructor (props: DiffHunkComponentProps) {
    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    return etch.destroy(this)
  }

  acceptProps ({diffHunk, fileIndex, hunkIndex, diffViewModel, mouseDownAction, mouseUpAction, mouseMovedAction}: DiffHunkComponentProps): Promise<void> {
    this.diffHunk = diffHunk
    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.diffViewModel = diffViewModel
    this.mouseDownAction = mouseDownAction
    this.mouseUpAction = mouseUpAction
    this.mouseMovedAction = mouseMovedAction

    if (this.element) {
      return etch.update(this)
    } else {
      etch.initialize(this)
      return Promise.resolve()
    }
  }

  update (props: DiffHunkComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
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
