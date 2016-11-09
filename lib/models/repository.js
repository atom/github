/** @babel */
import path from 'path'

import {Emitter} from 'atom'

import GitShellOutStrategy from '../git-shell-out-strategy'
import FilePatch from './file-patch'
import Hunk from './hunk'
import HunkLine from './hunk-line'
import MergeConflict from './merge-conflict'
import {readFile} from '../helpers'

const MERGE_MARKER_REGEX = /^(>|<){7} \S+$/m

export class AbortMergeError extends Error {
  constructor (code, path) {
    super()
    this.message = `${code}: ${path}.`
    this.code = code
    this.path = path
    this.stack = new Error().stack
  }
}

export class CommitError extends Error {
  constructor (code) {
    super()
    this.message = `Commit error: ${code}.`
    this.code = code
    this.stack = new Error().stack
  }
}

export default class Repository {
  static async open (workingDirectory, gitStrategy) {
    gitStrategy = gitStrategy || new GitShellOutStrategy(workingDirectory.getPath())
    if (await gitStrategy.isGitRepository(workingDirectory)) {
      return new Repository(workingDirectory, gitStrategy)
    } else {
      return null
    }
  }

  constructor (workingDirectory, gitStrategy) {
    this.workingDirectory = workingDirectory
    this.emitter = new Emitter()
    this.stagedFilePatchesByPath = new Map()
    this.stagedFilePatchesSinceParentCommitByPath = new Map()
    this.unstagedFilePatchesByPath = new Map()
    this.mergeConflictsByPath = new Map()
    this.git = gitStrategy
    this.destroyed = false
  }

  destroy () {
    this.destroyed = true
    this.emitter.emit('did-destroy')
    this.emitter.dispose()
  }

  isDestroyed () {
    return this.destroyed
  }

  onDidDestroy (callback) {
    return this.emitter.on('did-destroy', callback)
  }

  onDidUpdate (callback) {
    return this.emitter.on('did-update', callback)
  }

  didUpdate () {
    this.emitter.emit('did-update')
  }

  getWorkingDirectory () {
    return this.workingDirectory
  }

  getWorkingDirectoryPath () {
    return this.getWorkingDirectory().getRealPathSync()
  }

  getGitDirectoryPath () {
    return path.join(this.getWorkingDirectoryPath(), '.git')
  }

  async refresh () {
    if (process.env.PRINT_GIT_TIMES) console.time('refresh')
    this.stagedChangesPromise = this.fetchStagedChanges()
    this.stagedChangesSinceParentCommitPromise = this.fetchStagedChangesSinceParentCommit()
    this.unstagedChangesPromise = this.fetchUnstagedChanges()
    this.mergeConflictsPromise = this.fetchMergeConflicts()
    await Promise.all([
      this.stagedChangesPromise,
      this.stagedChangesSinceParentCommitPromise,
      this.unstagedChangesPromise,
      this.mergeConflictsPromise
    ])
    if (process.env.PRINT_GIT_TIMES) console.timeEnd('refresh')
    this.didUpdate()
  }

  getUnstagedChanges () {
    if (!this.unstagedChangesPromise) {
      this.unstagedChangesPromise = this.fetchUnstagedChanges()
    }
    return this.unstagedChangesPromise
  }

  getStagedChanges () {
    if (!this.stagedChangesPromise) {
      this.stagedChangesPromise = this.fetchStagedChanges()
    }
    return this.stagedChangesPromise
  }

  getStagedChangesSinceParentCommit () {
    if (!this.stagedChangesSinceParentCommitPromise) {
      this.stagedChangesSinceParentCommitPromise = this.fetchStagedChangesSinceParentCommit()
    }
    return this.stagedChangesSinceParentCommitPromise
  }

  getMergeConflicts () {
    if (!this.mergeConflictsPromise) {
      this.mergeConflictsPromise = this.fetchMergeConflicts()
    }
    return this.mergeConflictsPromise
  }

  async fetchUnstagedChanges () {
    const rawDiffs = await this.git.diff()
    return this.updateFilePatches(this.unstagedFilePatchesByPath, rawDiffs)
  }

  async fetchStagedChanges () {
    const rawDiffs = await this.git.diff({staged: true})
    return this.updateFilePatches(this.stagedFilePatchesByPath, rawDiffs)
  }

  async fetchStagedChangesSinceParentCommit () {
    try {
      const rawDiffs = await this.git.diff({staged: true, baseCommit: 'HEAD~'})
      return this.updateFilePatches(this.stagedFilePatchesSinceParentCommitByPath, rawDiffs)
    } catch (e) {
      if (e.message.includes(`ambiguous argument 'HEAD~'`)) {
        return []
      } else {
        throw e
      }
    }
  }

  updateFilePatches (patchesByPath, rawDiffs) {
    const filePatches = this.buildFilePatchesFromRawDiffs(rawDiffs)

    const validFilePatches = new Set()
    for (let newPatch of filePatches) {
      const path = newPatch.getPath()
      const existingPatch = patchesByPath.get(path)
      if (existingPatch == null) {
        patchesByPath.set(path, newPatch)
      } else {
        existingPatch.update(newPatch)
      }
      validFilePatches.add(path)
    }

    for (let [path, patch] of patchesByPath) {
      if (!validFilePatches.has(path)) {
        patchesByPath.delete(path)
        patch.destroy()
      }
    }

    return Array.from(patchesByPath.values()).sort((a, b) => a.getPath().localeCompare(b.getPath()))
  }

  buildFilePatchesFromRawDiffs (rawDiffs) {
    const statusMap = {
      '+': 'added',
      '-': 'deleted',
      ' ': 'unchanged'
    }
    return rawDiffs.map(patch => {
      const hunks = patch.hunks.map(hunk => {
        let oldLineNumber = hunk.oldStartLine
        let newLineNumber = hunk.newStartLine
        const hunkLines = hunk.lines.map(line => {
          let status = statusMap[line[0]]
          const text = line.slice(1)
          let hunkLine
          if (status === 'unchanged') {
            hunkLine = new HunkLine(text, status, oldLineNumber, newLineNumber)
            oldLineNumber++
            newLineNumber++
          } else if (status === 'added') {
            hunkLine = new HunkLine(text, status, -1, newLineNumber)
            newLineNumber++
          } else if (status === 'deleted') {
            hunkLine = new HunkLine(text, status, oldLineNumber, -1)
            oldLineNumber++
          } else if (status === undefined) {
            hunkLine = new HunkLine('\\' + text, status, -1, newLineNumber - 1)
          }
          return hunkLine
        })
        return new Hunk(hunk.oldStartLine, hunk.newStartLine, hunk.oldLineCount, hunk.newLineCount, hunkLines)
      })
      return new FilePatch(patch.oldPath, patch.newPath, patch.status, hunks)
    })
  }

  async fetchMergeConflicts () {
    const statusesByPath = (await this.git.getStatusesForChangedFiles()).mergeConflictFiles
    const validConflicts = new Set()
    for (let path in statusesByPath) {
      const statuses = statusesByPath[path]
      const existingConflict = this.mergeConflictsByPath.get(path)
      if (existingConflict == null) {
        this.mergeConflictsByPath.set(path, new MergeConflict(path, statuses.ours, statuses.theirs, statuses.file))
      } else {
        existingConflict.updateFileStatus(statuses.file)
      }
      validConflicts.add(path)
    }

    for (let [path, conflict] of this.mergeConflictsByPath) {
      if (!validConflicts.has(path)) {
        this.mergeConflictsByPath.delete(path)
        conflict.destroy()
      }
    }

    return Array.from(this.mergeConflictsByPath.values())
      .sort((a, b) => a.getPath().localeCompare(b.getPath()))
  }

  async stageFiles (paths) {
    await this.git.stageFiles(paths)
    await this.refresh()
  }

  async unstageFiles (paths) {
    await this.git.unstageFiles(paths)
    await this.refresh()
  }

  async stageFilesFromParentCommit (paths) {
    await this.git.unstageFiles(paths, 'HEAD~')
    await this.refresh()
  }

  async applyPatchToIndex (filePatch) {
    const patchStr = filePatch.getHeaderString() + filePatch.toString()
    await this.git.applyPatchToIndex(patchStr)
    await this.refresh()
  }

  async pathHasMergeMarkers (relativePath) {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), relativePath), 'utf8')
      return MERGE_MARKER_REGEX.test(contents)
    } catch (e) {
      if (e.code === 'ENOENT') return false
      else throw e
    }
  }

  getMergeHead () {
    return this.git.getMergeHead()
  }

  async getMergeMessage () {
    try {
      const contents = await readFile(path.join(this.getWorkingDirectoryPath(), '.git', 'MERGE_MSG'), 'utf8')
      return contents
    } catch (e) {
      return null
    }
  }

  async abortMerge () {
    await this.git.abortMerge()
    return this.refresh()
  }

  isMerging () {
    return this.git.isMerging()
  }

  async commit (message, options) {
    await this.git.commit(this.formatCommitMessage(message), options)
    this.stagedChangesPromise = null
    this.stagedChangesSinceParentCommitPromise = null
    this.didUpdate()
  }

  getLastCommit () {
    return this.git.getHeadCommit()
  }

  formatCommitMessage (message) {
    // strip out comments
    message = message.replace(/^#.*$/mg, '').trim()

    // hard wrap message (except for first line) at 72 characters
    let results = []
    lines = message.split('\n').map((line, index) => {
      if (line.length <= 72 || index === 0) {
        results.push(line)
      } else {
        const matches = line.match(/.{1,72}(\s|$)|\S+?(\s|$)/g)
          .map(line => {
            return line.endsWith('\n') ? line.substr(0, line.length - 1) : line
          })
        results = results.concat(matches)
      }
    })

    return results.join('\n')
  }

  readFileFromIndex (path) {
    return this.git.readFileFromIndex(path)
  }

  push (branchName, options) {
    return this.git.push(branchName, options)
  }

  fetch (branchName) {
    return this.git.fetch(branchName)
  }

  async pull (branchName) {
    await this.fetch(branchName)
    const remote = await this.git.getRemoteForBranch(branchName)
    return this.git.merge(`${remote}/${branchName}`)
  }

  getAheadCount (branchName) {
    return this.git.getAheadCount(branchName)
  }

  getBehindCount (branchName) {
    return this.git.getBehindCount(branchName)
  }

  getRemoteForBranch (branchName) {
    return this.git.getRemoteForBranch(branchName)
  }

  getCurrentBranch () {
    return this.git.getCurrentBranch()
  }

  getBranches () {
    return this.git.getBranches()
  }

  async checkout (branchName, options) {
    await this.git.checkout(branchName, options)
    await this.refresh()
  }

  setCommitState (state) {
    this.commitState = state
  }

  getCommitState () {
    return this.commitState
  }
}
