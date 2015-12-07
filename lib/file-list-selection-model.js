"use babel"

let {Emitter} = require('atom')

export default class FileListSelectionModel {
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

  getSelectedIndex() {
    return this.selectedIndex
  }

  selectPrevious() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
    this.emitChangeEvent()
  }

  selectNext() {
    filesLengthIndex = this.fileList.getFiles().length - 1
    this.selectedIndex = Math.min(this.selectedIndex + 1, filesLengthIndex)
    this.emitChangeEvent()
  }
}
