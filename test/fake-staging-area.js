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
    const file = new ChangedFile(oldName, newName, status)
    this.changedFiles.push(file)
    this.emitter.emit('did-change')
    return file
  }

  removeChangedFile (file) {
    const index = this.changedFiles.indexOf(file)
    if (index === -1) {
      throw new Error('The file you want to remove does not exist.')
    } else {
      this.changedFiles.splice(index, 1)
    }
  }

  getChangedFiles () {
    return this.changedFiles
  }
}
