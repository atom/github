/** @babel */

import {Emitter} from 'atom'
import ChangedFile from '../lib/changed-file'

export default class FakeStagingArea {
  constructor () {
    this.changedFiles = []
    this.emitter = new Emitter
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  addChangedFile ({status, oldName, newName}) {
    this.changedFiles.push(new ChangedFile(oldName, newName, status))
    this.emitter.emit('did-change')
  }

  getChangedFiles () {
    return this.changedFiles
  }
}
