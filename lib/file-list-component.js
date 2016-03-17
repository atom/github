/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'
// $FlowFixMe: Yes, we know this isn't a React component :\
import CommitBoxComponent from './commit-box-component'
import CommitBoxViewModel from './commit-box-view-model'
// $FlowFixMe: Yes, we know this isn't a React component :\
import FileSummaryComponent from './file-summary-component'
import FileDiffViewModel from './file-diff-view-model'

import type FileListViewModel from './file-list-view-model'
import type FileList from './file-list'

type FileListComponentProps = {fileListViewModel: FileListViewModel}

export default class FileListComponent {
  fileListViewModel: FileListViewModel;
  fileList: FileList;
  element: HTMLElement;
  commitBoxViewModel: CommitBoxViewModel;
  subscriptions: CompositeDisposable;

  constructor (props: FileListComponentProps) {
    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({fileListViewModel}: FileListComponentProps): Promise<void> {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    this.commitBoxViewModel = fileListViewModel.commitBoxViewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
    }

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.fileList.onDidChange(() => etch.update(this)))
    this.subscriptions.add(this.fileListViewModel.onDidChange(() => this.selectionDidChange()))

    this.subscriptions.add(atom.commands.add(this.element, {
      'core:move-up': () => this.fileListViewModel.moveSelectionUp(),
      'core:move-down': () => this.fileListViewModel.moveSelectionDown(),
      'core:confirm': () => this.fileListViewModel.toggleSelectedFilesStageStatus(),
      'git:open-diff': () => this.fileListViewModel.openSelectedFileDiff(),
      'git:open-file': () => this.fileListViewModel.openFile()
    }))

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'git:focus-file-list': () => this.focus()
    }))

    return updatePromise
  }

  focus () {
    this.element.focus()
  }

  async selectionDidChange (): Promise<void> {
    await this.fileListViewModel.openSelectedFileDiff()
    this.focus()

    return etch.update(this)
  }

  update (props: FileListComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  render () {
    const fileDiffViewModels = this.fileList.getFiles().map(fileDiff => {
      return new FileDiffViewModel(fileDiff)
    })

    return (
      <div className='git-Panel' tabIndex='-1'>
        <header className='git-Panel-header'>Changes</header>
        <div className='git-Panel-item git-Files'>{
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
  }

  onDoubleClickFileSummary (component: FileSummaryComponent) {
    component.viewModel.openDiff({pending: false})
  }

  onToggleFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.fileList.getFiles()[index].toggleStageStatus()
  }
}
