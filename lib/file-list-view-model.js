/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import GitService from './git-service'
import FileDiffViewModel from './file-diff-view-model'
import CommitBoxViewModel from './commit-box-view-model'

import type {Disposable} from 'atom'
import type GitStore from './git-store'
import type FileDiff from './file-diff'
import type HunkLine from './hunk-line'
import type {ObjectMap} from './common'

export default class FileListViewModel {
  gitService: GitService;
  fileListStore: GitStore;
  selectedIndex: number;
  emitter: Emitter;
  commitBoxViewModel: CommitBoxViewModel;
  subscriptions: CompositeDisposable;

  constructor (fileListStore: GitStore, gitService: GitService) {
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

  getGitStore (): GitStore {
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
    return this.getGitStore().getOrCreateFileFromPathName(name)
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
    const stage = file.getStageStatus() === 'unstaged'
    return this.stageFile(file, stage)
  }

  async stageFile (file: FileDiff, stage: boolean): Promise<void> {
    file.setIsStaged(stage)

    try {
      if (stage) {
        await this.gitService.stageFile(file)
      } else {
        await this.gitService.unstageFile(file)
      }
    } catch (e) {
      console.error(e)
    }

    // TODO: Handle errors.

    this.emitStagedEvent()
  }

  toggleSelectedFilesStageStatus (): Promise<void> {
    const file = this.getSelectedFile()
    return this.toggleFileStageStatus(file)
  }

  async stageLines (lines: Array<HunkLine>, stage: boolean): Promise<void> {
    if (lines.length === 0) return Promise.resolve()

    const groupedLines = this.groupedLinesByHunk(lines)
    for (const line of lines) {
      line.setIsStaged(stage)
    }

    try {
      const patches = await this.gitService.calculatePatchTexts(groupedLines, stage)
      const fileDiff = lines[0].hunk.diff
      if (stage) {
        await this.gitService.stagePatches(fileDiff, patches)
      } else {
        await this.gitService.unstagePatches(fileDiff, patches)
      }
    } catch (e) {
      console.error(e)
    }

    // TODO: handle errors

    this.emitStagedEvent()
  }

  groupedLinesByHunk (lines: Array<HunkLine>): ObjectMap<Array<HunkLine>> {
    return lines.reduce((linesByHunk, line) => {
      let lines = linesByHunk[line.hunk.toString()]
      if (!lines) {
        lines = []
        linesByHunk[line.hunk.toString()] = lines
      }

      lines.push(line)
      return linesByHunk
    }, {})
  }

  getFileDiffViewModels (): Array<FileDiffViewModel> {
    return this.fileListStore.getFiles().map(fileDiff => new FileDiffViewModel(fileDiff))
  }
}
