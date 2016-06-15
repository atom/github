/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import FileDiffViewModel from '../file-diff/file-diff-view-model'
import CommitBoxViewModel from '../commit-box/commit-box-view-model'
import PushPullViewModel from '../push-pull/push-pull-view-model'

import type {Disposable} from 'atom' // eslint-disable-line no-duplicate-imports
import type GitStore from '../git-store'
import type FileDiff from '../file-diff/file-diff'

export default class FileListViewModel {
  gitStore: GitStore;
  selectedIndex: number;
  emitter: Emitter;
  commitBoxViewModel: CommitBoxViewModel;
  pushPullViewModel: PushPullViewModel;
  subscriptions: CompositeDisposable;

  constructor (gitStore: GitStore) {
    this.gitStore = gitStore
    this.selectedIndex = 0
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()
    this.commitBoxViewModel = new CommitBoxViewModel(gitStore)
    this.pushPullViewModel = new PushPullViewModel(gitStore)
    this.pushPullViewModel.initialize()

    this.gitStore.onDidUpdate(() => this.emitUpdateEvent())
  }

  destroy () {
    this.pushPullViewModel.destroy()
    this.subscriptions.dispose()
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

  getGitStore (): GitStore {
    return this.gitStore
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
    const selectedFile = this.getSelectedFile()
    if (selectedFile) {
      return this.gitStore.openFileDiff(this.getSelectedFile())
    } else {
      return Promise.resolve()
    }
  }

  getFileAtIndex (index: number): FileDiff {
    return this.gitStore.getFiles()[index]
  }

  getDiffForPathName (name: string): FileDiff {
    return this.getGitStore().getOrCreateFileFromPathName(name)
  }

  openFile (): Promise<void> {
    return this.gitStore.openFile(this.getSelectedFile())
  }

  moveSelectionUp () {
    this.setSelectedIndex(Math.max(this.selectedIndex - 1, 0))
  }

  moveSelectionDown () {
    const filesLengthIndex = this.gitStore.getFiles().length - 1
    this.setSelectedIndex(Math.min(this.selectedIndex + 1, filesLengthIndex))
  }

  toggleFileStageStatus (file: FileDiff): Promise<void> {
    const stage = file.getStageStatus() === 'unstaged'
    return this.gitStore.stageFile(file, stage)
  }

  toggleSelectedFilesStageStatus (): Promise<void> {
    const file = this.getSelectedFile()
    return this.toggleFileStageStatus(file)
  }

  getFileDiffViewModels (): Array<FileDiffViewModel> {
    return this.gitStore.getFiles().map(fileDiff => new FileDiffViewModel(fileDiff))
  }

  setToken (t: ?string) {
    this.pushPullViewModel.setToken(t)
  }

  push (): Promise<void> {
    return this.pushPullViewModel.push()
  }
}
