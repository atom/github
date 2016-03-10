/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import CommitBoxViewModel from './commit-box-view-model'

import type {Disposable} from 'atom'
import type FileList from './file-list'
import type FileDiff from './file-diff'

export default class FileListViewModel {
  fileList: FileList;
  selectedIndex: number;
  emitter: Emitter;
  commitBoxViewModel: CommitBoxViewModel;
  subscriptions: CompositeDisposable;

  constructor (fileList: FileList) {
    this.fileList = fileList
    this.selectedIndex = 0
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()
    this.commitBoxViewModel = new CommitBoxViewModel(fileList.gitService)
    this.subscriptions.add(this.commitBoxViewModel.onDidCommit(() => this.emitDidCommitEvent()))
    this.subscriptions.add(this.fileList.onDidUserChange(() => this.emitUserChangeEvent()))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  async update (): Promise<void> {
    return Promise
      .all([
        this.commitBoxViewModel.update(),
        this.fileList.loadFromGitUtils()
      ])
      .then(() => { return })
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent () {
    this.emitter.emit('did-change')
  }

  onDidUserChange (callback: Function): Disposable {
    return this.emitter.on('did-user-change', callback)
  }

  emitUserChangeEvent () {
    this.emitter.emit('did-user-change')
  }

  onDidCommit (callback: Function): Disposable {
    return this.emitter.on('did-commit', callback)
  }

  emitDidCommitEvent () {
    this.emitter.emit('did-commit')
  }

  getFileList (): FileList {
    return this.fileList
  }

  getSelectedIndex (): number {
    return this.selectedIndex
  }

  setSelectedIndex (index: number) {
    const changed = index !== this.selectedIndex
    this.selectedIndex = index
    if (changed) this.emitChangeEvent()
  }

  getSelectedFile (): FileDiff {
    return this.fileList.getFiles()[this.selectedIndex]
  }

  openSelectedFileDiff (): Promise<void> {
    return this.fileList.openFileDiff(this.getSelectedFile())
  }

  getDiffForPathName (name: string): FileDiff {
    return this.getFileList().getOrCreateFileFromPathName(name)
  }

  openFile (): Promise<void> {
    return this.fileList.openFile(this.getSelectedFile())
  }

  moveSelectionUp () {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
    this.emitChangeEvent()
  }

  moveSelectionDown () {
    const filesLengthIndex = this.fileList.getFiles().length - 1
    this.selectedIndex = Math.min(this.selectedIndex + 1, filesLengthIndex)
    this.emitChangeEvent()
  }

  toggleSelectedFilesStageStatus () {
    const file = this.getSelectedFile()
    file.toggleStageStatus()
  }
}
