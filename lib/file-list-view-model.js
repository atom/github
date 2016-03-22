/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import GitService from './git-service'
import CommitBoxViewModel from './commit-box-view-model'

import type {Disposable} from 'atom'
import type FileList from './file-list'
import type FileDiff from './file-diff'

export default class FileListViewModel {
  gitService: GitService;
  fileList: FileList;
  selectedIndex: number;
  emitter: Emitter;
  commitBoxViewModel: CommitBoxViewModel;
  subscriptions: CompositeDisposable;

  constructor (fileList: FileList, gitService: GitService) {
    this.gitService = gitService
    this.fileList = fileList
    this.selectedIndex = 0
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()
    this.commitBoxViewModel = new CommitBoxViewModel(gitService)
    this.subscriptions.add(this.commitBoxViewModel.onDidCommit(() => this.emitDidCommitEvent()))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  async update (): Promise<void> {
    await Promise.all([
      this.commitBoxViewModel.update(),
      this.fileList.loadFromGitUtils()
    ])

    this.emitUpdateEvent()
  }

  onDidUpdate (callback: Function): Disposable {
    return this.emitter.on('did-update', callback)
  }

  emitUpdateEvent () {
    this.emitter.emit('did-update')
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

  getFileList (): FileList {
    return this.fileList
  }

  getSelectedIndex (): number {
    return this.selectedIndex
  }

  setSelectedIndex (index: number) {
    this.selectedIndex = index
    this.emitSelectionChangedEvent()
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
    this.setSelectedIndex(Math.max(this.selectedIndex - 1, 0))
  }

  moveSelectionDown () {
    const filesLengthIndex = this.fileList.getFiles().length - 1
    this.setSelectedIndex(Math.min(this.selectedIndex + 1, filesLengthIndex))
  }

  toggleSelectedFilesStageStatus (): Promise<void> {
    const file = this.getSelectedFile()
    let stagePromise = null
    if (file.getStageStatus() === 'unstaged') {
      stagePromise = this.gitService.stageFile(file)
    } else {
      stagePromise = this.gitService.unstageFile(file)
    }

    file.toggleStageStatus()
    return stagePromise.then(_ => { return })
  }
}
