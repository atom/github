/** @babel */

import FileDiff from './file-diff'
import GitService from './git-service'
import EventTransactor from './event-transactor'
import {CompositeDisposable, Emitter} from 'atom'

// FileList contains a collection of FileDiff objects
export default class FileList {
  constructor(files) {
    this.gitService = GitService.instance()
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter)
    this.setFiles(files || [])
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback)
  }

  didChange() {
    this.transactor.didChange()
  }

  setFiles(files) {
    if (this.fileSubscriptions)
      this.fileSubscriptions.dispose()
    this.fileSubscriptions = new CompositeDisposable
    this.files = files
    for (const file of files)
      this.fileSubscriptions.add(file.onDidChange(this.didChange.bind(this)))
    this.didChange()
  }

  getFiles() {
    return this.files
  }

  toString() {
    return this.files.map((file) => { return file.toString() }).join('\n')
  }

  async loadFromGitUtils() {
    console.log('loading');
    let fileDiffPool = {}
    for(let fileDiff of this.files) {
      fileDiffPool[fileDiff.getOldPathName()] = fileDiff
    }

    function getFileDiffFromPool(pathName) {
      let fileDiff = null
      if (fileDiffPool[pathName]) {
        fileDiff = fileDiffPool[pathName]
        delete fileDiffPool[pathName]
      }
      else
        fileDiff = new FileDiff()
      return fileDiff
    }

    let files = []

    // FIXME: for now, we need to get the stati for the diff stuff to work. :/
    this.gitService.getStatuses()
    let diffs = await this.gitService.getDiffs('all')
    // TODO: It's a bummer these two lines happen sequentially
    const stagedDiffs = await this.gitService.getDiffs('staged')

    const diffsByName = {}
    for (const diff of stagedDiffs) {
      // TODO: Old path is probably not always right.
      diffsByName[diff.oldFile().path()] = diff
    }

    this.transactor.transact(() => {
      for(let diff of diffs) {
        let fileDiff = getFileDiffFromPool(diff.oldFile().path())
        const stagedDiff = diffsByName[diff.oldFile().path()]
        fileDiff.fromGitUtilsObject({diff, stagedDiff})
        files.push(fileDiff)
      }
      this.setFiles(files)
    })
  }

  getFileDiffFromPathName(pathName) {
    for (let file of this.files) {
      console.log('compare', pathName, file.getNewPathName())
      if (pathName == file.getNewPathName())
        return file
    }
  }
}
