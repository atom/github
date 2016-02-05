/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import { CompositeDisposable } from 'atom'
import Common from './common'
import DOMListener from 'dom-listener'

export default class FileListComponent {
  constructor ({fileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.fileList.onDidChange(update)
    this.fileListViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    let onClickFileSummary = this.onClickFileSummary.bind(this)
    this.subscriptions = new CompositeDisposable
    this.subscriptions.add(listener.add('.file-summary', 'click', onClickFileSummary))

    atom.commands.add(this.element, {
      'core:move-up': () => this.fileListViewModel.moveSelectionUp(),
      'core:move-down': () => this.fileListViewModel.moveSelectionDown(),
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

  onClickFileSummary(event) {
    let fileSummaryElement = event.target.closest('.file-summary')
    let index = fileSummaryElement.component.getIndex()

    if (event.target.classList.contains('stage-status'))
      this.fileList.getFiles()[index].toggleStageStatus()
    else
      this.fileListViewModel.setSelectedIndex(index)
  }
}


class FileSummaryComponent {
  constructor ({fileListViewModel, fileDiff, index}) {
    this.index = index
    this.fileDiff = fileDiff
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)
    this.element.component = this
  }

  getIndex () {
    return this.index
  }

  render () {
    return (
      <div className={`file-summary ${this.getSelectedClass()}`}>
        {this.getStagingCheckbox()}
        {this.getIcon()}
        <span className="path">
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
