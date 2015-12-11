/** @babel */

import {Emitter} from 'atom'

export default class DiffViewModel {
  constructor({fileDiffs, uri}) {
    this.uri = uri
    this.fileDiffs = fileDiffs
    this.emitter = new Emitter()

    console.log('created', fileDiffs);
  }

  getTitle() {
    return 'Diff: '
  }

  getURI() {
    return this.uri
  }

  getFileDiffs() {
    return this.fileDiffs
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent() {
    this.emitter.emit('did-change')
  }
}
