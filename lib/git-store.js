/* @flow */

import {Emitter, CompositeDisposable} from 'atom'
import FileDiff from './file-diff'
import GitService from './git-service'

import type {Disposable} from 'atom'
import type {ObjectMap} from './common'
import type HunkLine from './hunk-line'
import type DiffHunk from './diff-hunk'

export type ChangeType = 'commit' | 'stage' | 'reload'

export default class GitStore {
  gitService: GitService;
  fileCache: ObjectMap<FileDiff>;
  files: Array<FileDiff>;
  branchName: string;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor (gitService: GitService) {
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()
    this.gitService = gitService
    this.branchName = ''
    this.fileCache = {}
    this.setFiles([])

    this.subscriptions.add(this.gitService.onDidChange(() => this.emitChangeEvent('reload')))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  onDidUpdate (callback: Function): Disposable {
    return this.emitter.on('did-update', callback)
  }

  emitUpdateEvent () {
    this.emitter.emit('did-update')
  }

  onDidChange (callback: (info: {changeType: ChangeType}) => void): Disposable {
    return this.emitter.on('did-change', callback)
  }

  emitChangeEvent (changeType: ChangeType) {
    this.emitter.emit('did-change', {changeType})
  }

  getGitService (): GitService { return this.gitService }

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
    this.files = files
    for (const file of files) {
      this.addFileToCache(file)
    }
  }

  getFiles (): Array<FileDiff> { return this.files }

  getBranchName (): string { return this.branchName }

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
  // * Then and the FileDiff::loadFromGit is called and there are changes
  // in `config.js`
  // * `loadFromGit` will use
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

  toString (): string {
    return this.files.map(file => file.toString()).join('\n')
  }

  async commit (message: string): Promise<void> {
    await this.gitService.commit(message)
    this.emitChangeEvent('commit')

    this.gitService.gitRepo.refreshStatus()
  }

  async stageFile (file: FileDiff, stage: boolean): Promise<void> {
    file.setIsStaged(stage)

    try {
      if (stage) {
        await this.gitService.stageFile(file)
      } else {
        await this.gitService.unstageFile(file)
      }
    } catch (e) {
      console.error(e)
    }

    // TODO: Handle errors.

    this.emitChangeEvent('stage')
  }

  async stageLines (lines: Array<HunkLine>, stage: boolean): Promise<void> {
    if (lines.length === 0) return Promise.resolve()

    const groupedLines = this.groupedLinesByHunk(lines)
    for (const line of lines) {
      line.setIsStaged(stage)
    }

    try {
      const patches = await this.gitService.calculatePatchTexts(groupedLines, stage)
      const fileDiff = lines[0].hunk.diff
      if (stage) {
        await this.gitService.stagePatches(fileDiff, patches)
      } else {
        await this.gitService.unstagePatches(fileDiff, patches)
      }
    } catch (e) {
      console.error(e)
    }

    // TODO: Handle errors.

    this.emitChangeEvent('stage')
  }

  groupedLinesByHunk (lines: Array<HunkLine>): ObjectMap<Array<HunkLine>> {
    return lines.reduce((linesByHunk, line) => {
      let lines = linesByHunk[line.hunk.toString()]
      if (!lines) {
        lines = []
        linesByHunk[line.hunk.toString()] = lines
      }

      lines.push(line)
      return linesByHunk
    }, {})
  }

  async loadFromGit (): Promise<void> {
    let files = []

    const statuses = await this.gitService.getStatuses()

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
      const statusFile = statuses[diff.oldFile().path()] || statuses[diff.newFile().path()]

      // $FlowFixMe
      let fileDiff = this.getOrCreateFileFromPathName(diff.newFile().path())
      // $FlowFixMe
      const stagedDiff = stagedDiffsByName[diff.newFile().path()]
      // $FlowFixMe
      const unstagedDiff = unstagedDiffsByName[diff.oldFile().path()]
      await fileDiff.fromGitObject({diff, stagedDiff, unstagedDiff, statusFile})
      files.push(fileDiff)
    }

    this.setFiles(files)

    this.branchName = await this.gitService.getCurrentBranchName()

    this.emitUpdateEvent()
  }

  checkoutBranch (name: string): Promise<void> {
    return this.gitService.checkoutBranch(name)
  }

  createAndCheckoutBranch (name: string): Promise<void> {
    return this.gitService.createAndCheckoutBranch(name)
  }
}
