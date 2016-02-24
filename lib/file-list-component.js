/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import { CompositeDisposable } from 'atom'
import DOMListener from 'dom-listener'

import type FileListViewModel from './file-list-view-model'
import type FileList from './file-list'
import type FileDiff from './file-diff'

export default class FileListComponent {
  fileListViewModel: FileListViewModel;
  fileList: FileList;
  element: HTMLElement;

  constructor ({fileListViewModel}: {fileListViewModel: FileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.fileList.onDidChange(update)
    this.fileListViewModel.onDidChange(update)

    atom.commands.add(this.element, {
      'core:move-up': () => this.fileListViewModel.moveSelectionUp(),
      'core:move-down': () => this.fileListViewModel.moveSelectionDown(),
      'core:confirm': () => this.fileListViewModel.toggleSelectedFilesStageStatus(),
      'git:open-diff': () => this.fileListViewModel.openSelectedFileDiff(),
      'git:open-file': () => this.fileListViewModel.openFile()
    })
  }

  render () {
    return (
      <div className='git-file-status-list' tabIndex='-1'>
        <div className='column-header'>
          Changes
        </div>
        <div className='files'>{
          this.fileList.getFiles().map((fileDiff, index) =>
            <FileSummaryComponent
              index={index}
              fileDiff={fileDiff}
              fileListViewModel={this.fileListViewModel}
              clickAction={c => this.onClickFileSummary(c)}
              doubleClickAction={c => this.onDoubleClickFileSummary(c)}
              toggleAction={c => this.onToggleFileSummary(c)}/>
          )
        }</div>
      </div>
    )
  }

  onClickFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.fileListViewModel.setSelectedIndex(index)
    component.fileDiff.openDiff({pending: true})
  }

  onDoubleClickFileSummary (component: FileSummaryComponent) {
    component.fileDiff.openDiff({pending: false})
  }

  onToggleFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.fileList.getFiles()[index].toggleStageStatus()
  }
}

// $FlowBug: We're not a React component, Flow
class FileSummaryComponent {
  index: number;
  fileDiff: FileDiff;
  fileListViewModel: FileListViewModel;
  element: HTMLElement;
  listener: DOMListener;
  subscriptions: CompositeDisposable;

  constructor ({fileListViewModel, fileDiff, index, clickAction, doubleClickAction, toggleAction}) {
    this.index = index
    this.fileDiff = fileDiff
    this.fileListViewModel = fileListViewModel
    this.subscriptions = new CompositeDisposable()

    etch.createElement(this)

    this.listener = new DOMListener(this.element)
    this.subscriptions.add(this.listener.add('.stage-status', 'click', () => toggleAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'click', () => clickAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'dblclick', () => doubleClickAction(this)))
  }

  getIndex (): number {
    return this.index
  }

  render () {
    return (
      <div className={`file-summary ${this.getSelectedClass()}`}>
        {this.renderStagingCheckbox()}
        <span className='path'>
          {this.fileDiff.getNewPathName()}
        </span>
        {this.renderIcon()}
      </div>
    )
  }

  getSelectedClass () {
    return this.fileListViewModel.getSelectedIndex() === this.index ? 'selected' : ''
  }

  renderStagingCheckbox () {
    let stageStatus = this.fileDiff.getStageStatus()
    return (
      <span className={`stage-status stage-status-${stageStatus}`}></span>
    )
  }

  renderIcon () {
    let changeStatus = this.fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
