/** @babel */

import {CompositeDisposable, Emitter} from 'atom'
import FileDiff from './file-diff'
import GitService from './git-service'
import EventTransactor from './event-transactor'

// FileList contains a collection of FileDiff objects
export default class FileList {
  constructor (files, {stageOnChange} = {}) {
    // TODO: Rather than this `stageOnChange` bool, there should probably be a
    // new object that just handles the connection to nodegit. Cause there are
    // several of these objects in the system, but only one of them handles
    // writing to the index.
    this.gitService = GitService.instance()
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter, {fileList: this})
    this.fileCache = {}
    this.setFiles(files || [])
    if (stageOnChange) {
      this.onDidChange(this.handleDidChange.bind(this))
    }
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  didChange (event) {
    this.transactor.didChange(event)
  }

  onDidUserChange (callback) {
    return this.emitter.on('did-user-change', callback)
  }

  didUserChange () {
    this.emitter.emit('did-user-change')
  }

  async handleDidChange (event) {
    if (!(event && event.events && event.fileList === this)) return
    if (this.isSyncingState()) return

    console.log('staging?', event)

    let stagePromises = []
    let stagableLinesPerHunk = {}
    let hunkToHunk = {}
    let hunkToDiff = {}

    for (let fileEvent of event.events) {
      if (!fileEvent) continue

      for (let hunkEvent of fileEvent.events) {
        if (!hunkEvent) continue

        const hunk = hunkEvent.hunk
        if (!stagableLinesPerHunk[hunk]) {
          stagableLinesPerHunk[hunk] = {
            linesToStage: [],
            linesToUnstage: []
          }
          hunkToHunk[hunk] = hunk
          hunkToDiff[hunk] = fileEvent.file
        }
        let stagableLines = stagableLinesPerHunk[hunk]
        for (let lineEvent of hunkEvent.events) {
          if (lineEvent.line && lineEvent.property === 'isStaged') {
            if (lineEvent.line.isStaged()) {
              stagableLines.linesToStage.push(lineEvent.line)
            } else {
              stagableLines.linesToUnstage.push(lineEvent.line)
            }
          }
        }
      }
    }

    for (let hunk in stagableLinesPerHunk) {
      let {linesToStage, linesToUnstage} = stagableLinesPerHunk[hunk]
      console.log('lines to stage:', linesToStage.length, '; unstage:', linesToUnstage.length)
      const h = hunkToHunk[hunk]
      const fileDiff = hunkToDiff[hunk]
      if (linesToStage.length) {
        stagePromises.push(this.stageLines(fileDiff, h, linesToStage, true))
      } else if (linesToUnstage.length) {
        stagePromises.push(this.stageLines(fileDiff, h, linesToUnstage, false))
      }
    }

    await Promise.all(stagePromises).catch(e => {
      console.log('FAIL staging', e)
    })
    this.didUserChange()
  }

  openFileDiffAtIndex (index) {
    return this.files[index].openDiff()
  }

  setFiles (files) {
    if (this.fileSubscriptions) {
      this.fileSubscriptions.dispose()
    }
    this.fileSubscriptions = new CompositeDisposable()
    this.files = files
    for (const file of files) {
      this.fileSubscriptions.add(file.onDidChange(this.didChange.bind(this)))
      this.addFileToCache(file)
    }
    this.didChange()
  }

  getFiles () {
    return this.files
  }

  // position = [0, 2] will get you the third hunk in the first file.
  // position = [0, 2, 1] will get you the 2nd line in the third hunk in the first file.
  getObjectAtPosition (position) {
    const [fileIndex, hunkIndex, lineIndex] = position

    const file = this.getFiles()[fileIndex]
    const hunk = file.getHunks()[hunkIndex]
    if (lineIndex != null) {
      return hunk.getLines()[lineIndex]
    } else {
      return hunk
    }
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
  addFileToCache (file) {
    if (file.getOldPathName() !== file.getNewPathName() && this.fileCache[file.getOldPathName()]) {
      delete this.fileCache[file.getOldPathName()]
    }
    this.fileCache[file.getNewPathName()] = file
  }

  getFileFromPathName (pathName) {
    return this.fileCache[pathName]
  }

  getOrCreateFileFromPathName (pathName) {
    let file = this.getFileFromPathName(pathName)
    if (!file) {
      file = new FileDiff({newPathName: pathName, oldPathName: pathName})
      this.addFileToCache(file)
    }
    return file
  }

  isSyncingState () {
    if (this.isSyncing) {
      return true
    }

    for (let file of this.files) {
      if (file.isSyncingState()) {
        return true
      }
    }

    return false
  }

  toString () {
    return this.files.map((file) => { return file.toString() }).join('\n')
  }

  async stageLines (fileDiff, hunk, lines, isStaged) {
    console.log(isStaged ? 'stageLines' : 'unstageLines', lines)

    let nodeGitLines = lines.map(line => line.line)
    const patchText = await this.gitService.calculatePatchText(hunk, nodeGitLines, isStaged)
    if (isStaged) {
      return this.gitService.stagePatch(fileDiff, patchText)
    } else {
      return this.gitService.unstagePatch(fileDiff, patchText)
    }
  }

  async loadFromGitUtils () {
    let files = []
    this.isSyncing = true

    // FIXME: for now, we need to get the stati for the diff stuff to work. :/
    this.gitService.getStatuses()
    let unifiedDiffs = await this.gitService.getDiffs('all')
    // TODO: It's a bummer these lines happen sequentially
    const stagedDiffs = await this.gitService.getDiffs('staged')
    const unstagedDiffs = await this.gitService.getDiffs('unstaged')

    const stagedDiffsByName = {}
    for (const diff of stagedDiffs) {
      // TODO: Old path is probably not always right.
      stagedDiffsByName[diff.oldFile().path()] = diff
    }

    const unstagedDiffsByName = {}
    for (const diff of unstagedDiffs) {
      // TODO: Old path is probably not always right.
      unstagedDiffsByName[diff.oldFile().path()] = diff
    }

    for (let diff of unifiedDiffs) {
      let fileDiff = this.getOrCreateFileFromPathName(diff.newFile().path())
      const stagedDiff = stagedDiffsByName[diff.newFile().path()]
      const unstagedDiff = unstagedDiffsByName[diff.newFile().path()]
      await fileDiff.fromGitUtilsObject({diff, stagedDiff, unstagedDiff})
      files.push(fileDiff)
    }

    this.transactor.transact(() => {
      this.setFiles(files)
    })
    this.isSyncing = false
  }
}
