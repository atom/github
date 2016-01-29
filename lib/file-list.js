/** @babel */

import FileDiff from './file-diff'
import GitService from './git-service'
import {CompositeDisposable, Disposable, Emitter} from 'atom'

// FileList contains a collection of FileDiff objects
export default class FileList {
  constructor(files) {
    this.gitService = GitService.instance()
    this.emitter = new Emitter()
    this.setFiles(files || [])
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  setFiles(files) {
    this.files = files
  }

  getFiles() {
    return this.files
  }

  toString() {
    return this.files.map((file) => { return file.toString() }).join('\n')
  }

  async loadFromGitUtils() {
    // FIXME: for now, we need to get the stati for the diff stuff to work. :/
    this.gitService.getStatuses()
    let diffs = await this.gitService.getDiffs('all')

    for(let diff of diffs) {
      let fileDiff = new FileDiff()
      fileDiff.fromGitUtilsObject({diff: diff})
      this.files.push(fileDiff)
    }
    this.emitter.emit('did-change')
  }

  getFileDiffFromPathName(pathName) {
    for (let file of this.files) {
      console.log('compare', pathName, file.getNewPathName())
      if (pathName == file.getNewPathName())
        return file
    }
  }
}
