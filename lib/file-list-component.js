/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'
// $FlowFixMe: Yes, we know this isn't a React component :\
import CommitBoxComponent from './commit-box-component'
// $FlowFixMe: Yes, we know this isn't a React component :\
import FileSummaryComponent from './file-summary-component'
// $FlowFixMe: Yes, we know this isn't a React component :\
import PushPullComponent from './push-pull-component'

import type FileListViewModel from './file-list-view-model'

type FileListComponentProps = {fileListViewModel: FileListViewModel}

export default class FileListComponent {
  viewModel: FileListViewModel;
  element: HTMLElement;
  subscriptions: CompositeDisposable;

  constructor (props: FileListComponentProps) {
    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({fileListViewModel}: FileListComponentProps): Promise<void> {
    this.viewModel = fileListViewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
    }

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.viewModel.onDidUpdate(() => etch.update(this)))
    this.subscriptions.add(this.viewModel.onSelectionChanged(() => this.selectionDidChange()))

    this.subscriptions.add(atom.commands.add(this.element, {
      'core:move-up': () => this.viewModel.moveSelectionUp(),
      'core:move-down': () => this.viewModel.moveSelectionDown(),
      'core:confirm': () => this.viewModel.toggleSelectedFilesStageStatus(),
      'git:open-diff': () => this.viewModel.openSelectedFileDiff(),
      'git:open-file': () => this.viewModel.openFile()
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
    await this.viewModel.openSelectedFileDiff()
    this.focus()

    return etch.update(this)
  }

  update (props: FileListComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  render () {
    return (
      <div className='git-Panel' tabIndex='-1'>
        <PushPullComponent viewModel={this.viewModel.pushPullViewModel}/>
        <header className='git-Panel-item is-header'>Changes</header>
        <div className='git-Panel-item is-flexible git-FileList'>{
          this.viewModel.getFileDiffViewModels().map((viewModel, index) =>
            <FileSummaryComponent
              selected={this.viewModel.getSelectedIndex() === index}
              index={index}
              viewModel={viewModel}
              clickAction={c => this.onClickFileSummary(c)}
              doubleClickAction={c => this.onDoubleClickFileSummary(c)}
              toggleAction={c => this.onToggleFileSummary(c)}/>
          )
        }</div>
        <CommitBoxComponent viewModel={this.viewModel.commitBoxViewModel}/>
      </div>
    )
  }

  onClickFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    this.viewModel.setSelectedIndex(index)
  }

  onDoubleClickFileSummary (component: FileSummaryComponent) {
    component.viewModel.openDiff({pending: false})
  }

  onToggleFileSummary (component: FileSummaryComponent) {
    const index = component.getIndex()
    const file = this.viewModel.getFileAtIndex(index)
    this.viewModel.toggleFileStageStatus(file)
  }
}
