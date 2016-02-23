/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import { CompositeDisposable } from 'atom'
import DOMListener from 'dom-listener'

import type FileListViewModel from './file-list-view-model'
import type FileList from './file-list'
import type FileDiff from './file-diff'
import type {EtchElement} from './common'

export default class FileListComponent {
  fileListViewModel: FileListViewModel;
  fileList: FileList;
  listener: DOMListener;
  element: EtchElement<FileListComponent>;
  subscriptions: CompositeDisposable;

  constructor ({fileListViewModel}: {fileListViewModel: FileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.fileList.onDidChange(update)
    this.fileListViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    const onClickFileSummary = this.onClickFileSummary.bind(this)
    const onDoubleClickFileSummary = this.onDoubleClickFileSummary.bind(this)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(listener.add('.file-summary', 'click', onClickFileSummary))
    this.subscriptions.add(listener.add('.file-summary', 'dblclick', onDoubleClickFileSummary))

    atom.commands.add(this.element, {
      'core:move-up': () => this.fileListViewModel.moveSelectionUp(),
      'core:move-down': () => this.fileListViewModel.moveSelectionDown(),
      'core:confirm': () => this.fileListViewModel.toggleSelectedFilesStageStatus(),
      'git:open-diff': () => this.fileListViewModel.openSelectedFileDiff()
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
            <FileSummaryComponent index={index} fileDiff={fileDiff} fileListViewModel={this.fileListViewModel} />
          )
        }</div>
      </div>
    )
  }

  onClickFileSummary (event: Event) {
    // $FlowFixMe: I guess we get .closest from jQuery?
    const fileSummaryElement = event.target.closest('.file-summary')
    const component = fileSummaryElement.component
    const index = component.getIndex()

    // $FlowFixMe: Only Elements have classList.
    if (event.target.classList.contains('stage-status')) {
      this.fileList.getFiles()[index].toggleStageStatus()
    } else {
      this.fileListViewModel.setSelectedIndex(index)
      component.fileDiff.openDiff({pending: true})
    }
  }

  onDoubleClickFileSummary (event: Event) {
    // $FlowFixMe: I guess we get .closest from jQuery?
    const fileSummaryElement = event.target.closest('.file-summary')
    const component = fileSummaryElement.component
    component.fileDiff.openDiff({pending: false})
  }
}

// $FlowFixMe: We're not a React component, Flow
class FileSummaryComponent {
  index: number;
  fileDiff: FileDiff;
  fileListViewModel: FileListViewModel;
  element: EtchElement<FileSummaryComponent>;

  constructor ({fileListViewModel, fileDiff, index}) {
    this.index = index
    this.fileDiff = fileDiff
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)
    this.element.component = this
  }

  getIndex (): number {
    return this.index
  }

  render () {
    return (
      <div className={`file-summary ${this.getSelectedClass()}`}>
        {this.getStagingCheckbox()}
        {this.getIcon()}
        <span className='path'>
          {this.fileDiff.getNewPathName()}
        </span>
      </div>
    )
  }

  getSelectedClass () {
    return this.fileListViewModel.getSelectedIndex() === this.index ? 'selected' : ''
  }

  getStagingCheckbox () {
    let stageStatus = this.fileDiff.getStageStatus()
    return (
      <span className={`stage-status stage-status-${stageStatus}`}></span>
    )
  }

  getIcon () {
    let changeStatus = this.fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
