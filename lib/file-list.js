/** @babel */

import Git from 'nodegit'
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
    this.fileCache = {}
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
    for (const file of files) {
      this.fileSubscriptions.add(file.onDidChange(this.didChange.bind(this)))
      this.addFileToCache(file)
    }
    this.didChange()
  }

  getFiles() {
    return this.files
  }

  // position = [0, 2] will get you the third hunk in the first file.
  // position = [0, 2, 1] will get you the 2nd line in the third hunk in the first file.
  getObjectAtPosition(position) {
    let file, hunk, line
    const [fileIndex, hunkIndex, lineIndex] = position

    file = this.getFiles()[fileIndex]
    hunk = file.getHunks()[hunkIndex]
    if (lineIndex != null)
      return hunk.getLines()[lineIndex]
    else
      return hunk
  }

  // The file cache should allow all UI elements usage of the same FileDiff
  // models. Sometimes it's a bit of a chicken and egg problem, and it happens
  // when a tab is deserialized.
  //
  // * Let's say there is a Diff tab being deserialized for `config.js`.
  // * The deserializer runs before nodegit knows the state of things, but the
  // tab needs a model. The tab will use `getOrCreateFileFromPathName` to get
  // the model.
  // * Then and the FileDiff::loadFromGitUtils is called and there are changes
  // in `config.js`
  // * `loadFromGitUtils` will use
  // `getOrCreateFileFromPathName('config.js')`, which will grab the same model
  // that the Diff tab is using.
  // * The model will be updated from the nodegit state and the Diff tab will
  // update properly.
  addFileToCache(file) {
    if (file.getOldPathName() != file.getNewPathName() && this.fileCache[file.getOldPathName()])
      delete this.fileCache[file.getOldPathName()]
    this.fileCache[file.getNewPathName()] = file
  }

  getFileFromPathName(pathName) {
    return this.fileCache[pathName]
  }

  getOrCreateFileFromPathName(pathName) {
    let file = this.getFileFromPathName(pathName)
    if (!file) {
      file = new FileDiff({newPathName: pathName, oldPathName: pathName})
      this.addFileToCache(file)
    }
    return file
  }

  toString() {
    return this.files.map((file) => { return file.toString() }).join('\n')
  }

  async stageLine(line, state) {
    let repo = null
    try {
      repo = await Git.Repository.open(this.gitService.repoPath)
    } catch (e) {
      console.log(e)
      // TODO: Means we're not actually in a repo. Fine for now.
      return Promise.resolve()
    }

    return repo.stageLines(line.fileName, [line.line], !state)
  }

  async loadFromGitUtils() {
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

    const stageFn = (line, state) => {
      return this.stageLine(line, state)
    }

    for(let diff of diffs) {
      let fileDiff = this.getOrCreateFileFromPathName(diff.newFile().path())
      const stagedDiff = diffsByName[diff.newFile().path()]
      await fileDiff.fromGitUtilsObject({diff, stagedDiff, stageFn})
      files.push(fileDiff)
    }

    this.transactor.transact(() => {
      this.setFiles(files)
    })
  }
}
