/* @flow */

import {CompositeDisposable, Emitter} from 'atom'
import FileDiff from './file-diff'
import GitService from './git-service'
import EventTransactor from './event-transactor'

import type {ObjectMap} from './common'
import type {Disposable} from 'atom'
import type HunkLine from './hunk-line'
import type DiffHunk from './diff-hunk'

// FileList contains a collection of FileDiff objects
export default class FileList {
  gitService: GitService;
  emitter: Emitter;
  transactor: EventTransactor;
  fileCache: ObjectMap<FileDiff>;
  files: Array<FileDiff>;
  fileSubscriptions: CompositeDisposable;
  isSyncing: boolean;

  constructor (files: Array<FileDiff>, gitService: GitService, {stageOnChange}: {stageOnChange?: boolean} = {}) {
    // TODO: Rather than this `stageOnChange` bool, there should probably be a
    // new object that just handles the connection to nodegit. Cause there are
    // several of these objects in the system, but only one of them handles
    // writing to the index.
    this.gitService = gitService
    this.emitter = new Emitter()
    this.transactor = new EventTransactor(this.emitter, {fileList: this})
    this.fileCache = {}
    this.setFiles(files || [])
    if (stageOnChange) {
      this.onDidChange(this.handleDidChange.bind(this))
    }
  }

  onDidChange (callback: Function): Disposable {
    return this.emitter.on('did-change', callback)
  }

  didChange (event: ?Object) {
    this.transactor.didChange(event)
  }

  onDidUserChange (callback: Function): Disposable {
    return this.emitter.on('did-user-change', callback)
  }

  didUserChange () {
    this.emitter.emit('did-user-change')
  }

  async handleDidChange (event: Object): Promise<void> {
    if (!(event && event.events && event.fileList === this)) return
    if (this.isSyncingState()) return

    console.log(event)

    const extractedLines = this.extractLinesFromEventByHunk(event)
    if (extractedLines) {
      const {stagableLinesByHunk, fileDiff, stage} = extractedLines
      await this.stageLines(fileDiff, stagableLinesByHunk, stage)
      this.didUserChange()
      return
    }

    const rootEvent = event.events[0]
    if (rootEvent && rootEvent.property === 'stageStatus' && rootEvent.file) {
      const file: FileDiff = rootEvent.file
      // In both cases we end up here (renamed, mode change), we know we have a
      // new file name.
      // $FlowSilence
      await this.gitService.stagePath(file.getNewFileName())
      this.didUserChange()
      return
    }
  }

  async stageLines (fileDiff: FileDiff, stagableLinesPerHunk: ObjectMap<{linesToStage: Array<HunkLine>, linesToUnstage: Array<HunkLine>}>, stage: boolean): Promise<void> {
    const patches = await this.gitService.calculatePatchTexts(stagableLinesPerHunk, stage)
    await this.stagePatches(fileDiff, patches, stage)
  }

  extractLinesFromEventByHunk (event: Object): ?{stagableLinesByHunk: ObjectMap<{linesToStage: Array<HunkLine>, linesToUnstage: Array<HunkLine>}>, fileDiff: FileDiff, stage: boolean} {
    let stagableLinesByHunk = {}
    let fileDiff = null
    let stage = true
    for (let fileEvent of event.events) {
      if (!fileEvent) continue

      fileDiff = fileEvent.file

      const fileEvents = fileEvent.events
      if (!fileEvents) {
        return null
      }

      for (let hunkEvent of fileEvents) {
        if (!hunkEvent) continue

        const hunk = hunkEvent.hunk
        if (!stagableLinesByHunk[hunk]) {
          stagableLinesByHunk[hunk] = {
            linesToStage: [],
            linesToUnstage: []
          }
        }
        const stagableLines = stagableLinesByHunk[hunk]
        for (let lineEvent of hunkEvent.events) {
          if (lineEvent.line && lineEvent.property === 'isStaged') {
            if (lineEvent.line.isStaged()) {
              stagableLines.linesToStage.push(lineEvent.line)
              stage = true
            } else {
              stagableLines.linesToUnstage.push(lineEvent.line)
              stage = false
            }
          }

          if (stagableLines.linesToStage.length > 0 && stagableLines.linesToUnstage.length > 0) {
            throw new Error("Can't toggle stagedness on a selection that has mixed stage (yet) :(")
          }
        }
      }
    }

    // $FlowSilence: We know `fileDiff` won't be null by the time we get here.
    return {stagableLinesByHunk, fileDiff, stage}
  }

  openFile (file: FileDiff): Promise<void> {
    const pathName = file.getNewPathName()
    if (pathName) {
      return atom.workspace.open(pathName, {pending: true})
    } else {
      return Promise.resolve()
    }
  }

  openFileDiff (file: FileDiff): Promise<void> {
    return file.openDiff({pending: true})
  }

  setFiles (files: Array<FileDiff>) {
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

  getFiles (): Array<FileDiff> {
    return this.files
  }

  // position = [0, 2] will get you the third hunk in the first file.
  // position = [0, 2, 1] will get you the 2nd line in the third hunk in the first file.
  getObjectAtPosition (position: [number, number, ?number]): HunkLine | DiffHunk {
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
  addFileToCache (file: FileDiff) {
    const oldPathName = file.getOldPathName()
    if (oldPathName !== file.getNewPathName() && oldPathName && this.fileCache[oldPathName]) {
      delete this.fileCache[oldPathName]
    }

    const newPathName = file.getNewPathName()
    if (newPathName) {
      this.fileCache[newPathName] = file
    }
  }

  getFileFromPathName (pathName: string): ?FileDiff {
    return this.fileCache[pathName]
  }

  getOrCreateFileFromPathName (pathName: string): FileDiff {
    let file = this.getFileFromPathName(pathName)
    if (!file) {
      file = new FileDiff({newPathName: pathName, oldPathName: pathName})
      this.addFileToCache(file)
    }
    return file
  }

  isSyncingState (): boolean {
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

  toString (): string {
    return this.files.map(file => file.toString()).join('\n')
  }

  async stagePatches (fileDiff: FileDiff, patches: Array<string>, stage: boolean): Promise<number> {
    if (stage) {
      return this.gitService.stagePatches(fileDiff, patches)
    } else {
      return this.gitService.unstagePatches(fileDiff, patches)
    }
  }

  async loadFromGitUtils (): Promise<void> {
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
      // $FlowFixMe
      stagedDiffsByName[diff.oldFile().path()] = diff
    }

    const unstagedDiffsByName = {}
    for (const diff of unstagedDiffs) {
      // TODO: Old path is probably not always right.
      // $FlowFixMe
      unstagedDiffsByName[diff.oldFile().path()] = diff
    }

    for (let diff of unifiedDiffs) {
      // $FlowFixMe
      let fileDiff = this.getOrCreateFileFromPathName(diff.newFile().path())
      // $FlowFixMe
      const stagedDiff = stagedDiffsByName[diff.newFile().path()]
      // $FlowFixMe
      const unstagedDiff = unstagedDiffsByName[diff.oldFile().path()]
      await fileDiff.fromGitUtilsObject({diff, stagedDiff, unstagedDiff})
      files.push(fileDiff)
    }

    this.transactor.transact(() => {
      this.setFiles(files)
    })
    this.isSyncing = false
  }
}
