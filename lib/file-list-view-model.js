/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import GitService from './git-service'
import FileDiffViewModel from './file-diff-view-model'
import CommitBoxViewModel from './commit-box-view-model'

import type {Disposable} from 'atom'
import type FileListStore from './file-list-store'
import type FileDiff from './file-diff'

export default class FileListViewModel {
  gitService: GitService;
  fileListStore: FileListStore;
  selectedIndex: number;
  emitter: Emitter;
  commitBoxViewModel: CommitBoxViewModel;
  subscriptions: CompositeDisposable;

  constructor (fileListStore: FileListStore, gitService: GitService) {
    this.gitService = gitService
    this.fileListStore = fileListStore
    this.selectedIndex = 0
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()
    this.commitBoxViewModel = new CommitBoxViewModel(gitService)
    this.subscriptions.add(this.commitBoxViewModel.onDidCommit(() => this.emitDidCommitEvent()))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  update (): Promise<void> {
    return this.commitBoxViewModel.update()
  }

  onDidStage (callback: Function): Disposable {
    return this.emitter.on('did-stage', callback)
  }

  emitStagedEvent () {
    this.emitter.emit('did-stage')
  }

  onSelectionChanged (callback: Function): Disposable {
    return this.emitter.on('selection-changed', callback)
  }

  emitSelectionChangedEvent () {
    this.emitter.emit('selection-changed')
  }

  onDidCommit (callback: Function): Disposable {
    return this.emitter.on('did-commit', callback)
  }

  emitDidCommitEvent () {
    this.emitter.emit('did-commit')
  }

  getFileListStore (): FileListStore {
    return this.fileListStore
  }

  getSelectedIndex (): number {
    return this.selectedIndex
  }

  setSelectedIndex (index: number) {
    this.selectedIndex = index
    this.emitSelectionChangedEvent()
  }

  getSelectedFile (): FileDiff {
    return this.getFileAtIndex(this.selectedIndex)
  }

  openSelectedFileDiff (): Promise<void> {
    return this.fileListStore.openFileDiff(this.getSelectedFile())
  }

  getFileAtIndex (index: number): FileDiff {
    return this.fileListStore.getFiles()[index]
  }

  getDiffForPathName (name: string): FileDiff {
    return this.getFileListStore().getOrCreateFileFromPathName(name)
  }

  openFile (): Promise<void> {
    return this.fileListStore.openFile(this.getSelectedFile())
  }

  moveSelectionUp () {
    this.setSelectedIndex(Math.max(this.selectedIndex - 1, 0))
  }

  moveSelectionDown () {
    const filesLengthIndex = this.fileListStore.getFiles().length - 1
    this.setSelectedIndex(Math.min(this.selectedIndex + 1, filesLengthIndex))
  }

  toggleFileStageStatus (file: FileDiff): Promise<void> {
    let stagePromise = null
    if (file.getStageStatus() === 'unstaged') {
      stagePromise = this.gitService.stageFile(file)
    } else {
      stagePromise = this.gitService.unstageFile(file)
    }
    // TODO: Handle errors.

    file.toggleStageStatus()

    this.emitStagedEvent()
    return stagePromise.then(_ => { return })
  }

  toggleSelectedFilesStageStatus (): Promise<void> {
    const file = this.getSelectedFile()
    return this.toggleFileStageStatus(file)
  }

  getFileDiffViewModels (): Array<FileDiffViewModel> {
    return this.fileListStore.getFiles().map(fileDiff => new FileDiffViewModel(fileDiff))
  }
}
