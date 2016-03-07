/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowBug: Yes, we know this isn't a React component :\
import DiffHunkComponent from './diff-hunk-component'

import type FileDiff from './file-diff'
import type DiffViewModel from './diff-view-model'

export default class FileDiffComponent {
  fileDiff: FileDiff;
  fileIndex: number;
  diffViewModel: DiffViewModel;
  element: HTMLElement;
  mouseDownAction: Function;
  mouseUpAction: Function;
  mouseMovedAction: Function;

  constructor ({fileDiff, fileIndex, diffViewModel, mouseDownAction, mouseUpAction, mouseMovedAction}: {fileDiff: FileDiff, fileIndex: number, diffViewModel: DiffViewModel, mouseDownAction: Function, mouseUpAction: Function, mouseMovedAction: Function}) {
    this.fileIndex = fileIndex
    this.fileDiff = fileDiff
    this.diffViewModel = diffViewModel
    this.mouseDownAction = mouseDownAction
    this.mouseUpAction = mouseUpAction
    this.mouseMovedAction = mouseMovedAction

    etch.initialize(this)
  }

  renderHunks (): Array<DiffHunkComponent> {
    return this.fileDiff.getHunks().map((diffHunk, index) => {
      // $FlowBug: Yes, it's not a React element
      return <DiffHunkComponent
        diffHunk={diffHunk}
        fileIndex={this.fileIndex}
        hunkIndex={index}
        diffViewModel={this.diffViewModel}
        mouseDownAction={this.mouseDownAction}
        mouseUpAction={this.mouseUpAction}
        mouseMovedAction={this.mouseMovedAction}
      />
    })
  }

  renderEmpty () {
    return (
      <div className='empty-diff'>
        <ul className='background-message centered'>
          <li>No Changes</li>
        </ul>
      </div>
    )
  }

  render () {
    return (
      <div className='git-file-diff'>
        <div className='patch-description'>
          {this.renderIconForFileDiff(this.fileDiff)}
          <span className='text'>
            <strong className='path'>{this.fileDiff.getNewPathName()}</strong>
          </span>
        </div>
        {this.fileDiff.getHunks().length ? this.renderHunks() : this.renderEmpty()}
      </div>
    )
  }

  renderIconForFileDiff (fileDiff: FileDiff) {
    let changeStatus = fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
