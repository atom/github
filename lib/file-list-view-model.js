/** @babel */

import {Emitter} from 'atom'

export default class FileListViewModel {
  constructor(fileList) {
    this.fileList = fileList
    this.selectedIndex = 0
    this.emitter = new Emitter()
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }

  getFileList() {
    return this.fileList
  }

  getSelectedIndex() {
    return this.selectedIndex
  }

  getSelectedFile() {
    return this.fileList.getFiles()[this.selectedIndex]
  }

  openSelectedFileDiff() {
    return this.fileList.openFileDiffAtIndex(this.selectedIndex)
  }

  moveSelectionUp() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
    this.emitChangeEvent()
  }

  moveSelectionDown() {
    filesLengthIndex = this.fileList.getFiles().length - 1
    this.selectedIndex = Math.min(this.selectedIndex + 1, filesLengthIndex)
    this.emitChangeEvent()
  }
}
