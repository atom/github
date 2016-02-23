/* @flow */

import {Emitter} from 'atom'

import type {Disposable} from 'atom'
import type FileList from './file-list'
import type FileDiff from './file-diff'

export default class FileListViewModel {
  fileList: FileList;
  selectedIndex: number;
  emitter: Emitter;

  constructor (fileList: FileList) {
    this.fileList = fileList
    this.selectedIndex = 0
    this.emitter = new Emitter()
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent () {
    this.emitter.emit('did-change')
  }

  getFileList (): FileList {
    return this.fileList
  }

  getSelectedIndex (): number {
    return this.selectedIndex
  }

  setSelectedIndex (index: number) {
    this.selectedIndex = index
    this.emitChangeEvent()
  }

  getSelectedFile (): FileDiff {
    return this.fileList.getFiles()[this.selectedIndex]
  }

  openSelectedFileDiff (): Promise<void> {
    return this.fileList.openFileDiff(this.getSelectedFile())
  }

  openFile () {
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
