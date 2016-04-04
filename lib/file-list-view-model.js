/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import FileDiffViewModel from './file-diff-view-model'
import CommitBoxViewModel from './commit-box-view-model'
import PushPullViewModel from './push-pull-view-model'

import type {Disposable} from 'atom'
import type GitStore from './git-store'
import type FileDiff from './file-diff'

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

    this.gitStore.onDidUpdate(() => this.emitUpdateEvent())
  }

  destroy () {
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
    return this.gitStore.openFileDiff(this.getSelectedFile())
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
}
