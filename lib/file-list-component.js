/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowFixMe: Yes, we know this isn't a React component :\
import CommitBoxComponent from './commit-box-component'
import CommitBoxViewModel from './commit-box-view-model'
// $FlowFixMe: Yes, we know this isn't a React component :\
import FileSummaryComponent from './file-summary-component'
import FileDiffViewModel from './file-diff-view-model'

import type FileListViewModel from './file-list-view-model'
import type FileList from './file-list'

export default class FileListComponent {
  fileListViewModel: FileListViewModel;
  fileList: FileList;
  element: HTMLElement;
  commitBoxViewModel: CommitBoxViewModel;

  constructor ({fileListViewModel}: {fileListViewModel: FileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    this.commitBoxViewModel = fileListViewModel.commitBoxViewModel

    etch.initialize(this)

    let update = () => etch.update(this)
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
    const fileDiffViewModels = this.fileList.getFiles().map(fileDiff => {
      return new FileDiffViewModel(fileDiff)
    })

    return (
      <div className='git-file-status-list' tabIndex='-1'>
        <div className='column-header'>
          Changes
        </div>
        <div className='files'>{
          fileDiffViewModels.map((viewModel, index) =>
            <FileSummaryComponent
              selected={this.fileListViewModel.getSelectedIndex() === index}
              index={index}
              viewModel={viewModel}
              clickAction={c => this.onClickFileSummary(c)}
              doubleClickAction={c => this.onDoubleClickFileSummary(c)}
              toggleAction={c => this.onToggleFileSummary(c)}/>
          )
        }</div>
        <CommitBoxComponent viewModel={this.commitBoxViewModel}/>
      </div>
    )
  }

  onClickFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.fileListViewModel.setSelectedIndex(index)
    component.viewModel.openDiff({pending: true})
  }

  onDoubleClickFileSummary (component: FileSummaryComponent) {
    component.viewModel.openDiff({pending: false})
  }

  onToggleFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.fileList.getFiles()[index].toggleStageStatus()
  }
}
