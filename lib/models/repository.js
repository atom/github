/** @babel */

import {Emitter} from 'atom'
import Git from 'nodegit'

import path from 'path'
import fs from 'fs'

import GitShellOutStrategy from '../git-shell-out-strategy'

import FilePatch from './file-patch'
import Hunk from './hunk'
import HunkLine from './hunk-line'
import MergeConflict from './merge-conflict'

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
    const rawRepository = await Git.Repository.open(workingDirectory.getPath())
    return new Repository(rawRepository, workingDirectory, gitStrategy)
  }

  constructor (rawRepository, workingDirectory, gitStrategy) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
    this.emitter = new Emitter()
    this.stagedFilePatchesByPath = new Map()
    this.unstagedFilePatchesByPath = new Map()
    this.mergeConflictsByPath = new Map()
    this.git = gitStrategy || new GitShellOutStrategy(workingDirectory.getPath())
  }

  destroy () {
    this.emitter.dispose()
    this.rawRepository = null
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
    return this.rawRepository.path()
  }

  async refresh () {
    if (global.PRINT_GIT_TIMES) console.time('refresh')
    await this.refreshStagedChanges()
    await this.refreshUnstagedChanges()
    await this.refreshMergeConflicts()
    if (global.PRINT_GIT_TIMES) console.timeEnd('refresh')
    this.didUpdate()
  }

  getUnstagedChanges () {
    return this.unstagedChangesPromise || this.refreshUnstagedChanges()
  }

  getStagedChanges () {
    return this.stagedChangesPromise || this.refreshStagedChanges()
  }

  getMergeConflicts () {
    return this.mergeConflictsPromise || this.refreshMergeConflicts()
  }

  refreshUnstagedChanges () {
    this.unstagedChangesPromise = this.fetchUnstagedChanges()
    return this.unstagedChangesPromise
  }

  refreshStagedChanges () {
    this.stagedChangesPromise = this.fetchStagedChanges()
    return this.stagedChangesPromise
  }

  refreshMergeConflicts () {
    this.mergeConflictsPromise = this.fetchMergeConflicts()
    return this.mergeConflictsPromise
  }

  async fetchUnstagedChanges () {
    const rawDiffs = await this.git.diff()
    const validFilePatches = new Set()
    for (let newPatch of this.buildFilePatchesFromRawDiffs(rawDiffs)) {
      const path = newPatch.getPath()
      const existingPatch = this.unstagedFilePatchesByPath.get(path)
      if (existingPatch == null) {
        this.unstagedFilePatchesByPath.set(path, newPatch)
      } else {
        existingPatch.update(newPatch)
      }
      validFilePatches.add(path)
    }

    for (let [path, patch] of this.unstagedFilePatchesByPath) {
      if (!validFilePatches.has(path)) {
        this.unstagedFilePatchesByPath.delete(path)
        patch.destroy()
      }
    }
    return Array.from(this.unstagedFilePatchesByPath.values())
      .sort((a, b) => a.getPath().localeCompare(b.getPath()))
  }

  async fetchStagedChanges () {
    const rawDiffs = await this.git.diff({staged: true})
    const validFilePatches = new Set()
    for (let newPatch of this.buildFilePatchesFromRawDiffs(rawDiffs)) {
      const path = newPatch.getPath()
      const existingPatch = this.stagedFilePatchesByPath.get(path)
      if (existingPatch == null) {
        this.stagedFilePatchesByPath.set(path, newPatch)
      } else {
        existingPatch.update(newPatch)
      }
      validFilePatches.add(path)
    }

    for (let [path, patch] of this.stagedFilePatchesByPath) {
      if (!validFilePatches.has(path)) {
        this.stagedFilePatchesByPath.delete(path)
        patch.destroy()
      }
    }
    return Array.from(this.stagedFilePatchesByPath.values())
      .sort((a, b) => a.getPath().localeCompare(b.getPath()))
  }

  buildFilePatchesFromRawDiffs (rawDiffs) {
    const statusMap = {
      '+': 'added',
      '-': 'removed',
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
          } else if (status === 'removed') {
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
    const statusesByPath = await this.git.getMergeConflictFileStatus()
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

  async stageFile (...paths) {
    await Promise.all(paths.map(path => this.git.stageFile(path)))
    await this.refresh()
  }

  async unstageFile (...paths) {
    await Promise.all(paths.map(path => this.git.unstageFile(path)))
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
    await this.git.commit(this.stripCommitComments(message), options)
    this.refreshStagedChanges()
    this.didUpdate()
  }

  getLastCommit () {
    return this.git.getHeadCommit()
  }

  stripCommitComments (message) {
    return message.replace(/^#.*$/mg, '').trim()
  }

  readFileFromIndex (path) {
    return this.git.readFileFromIndex(path)
  }

  push (branchName) {
    return this.git.push(branchName)
  }

  async getBranchRemoteName (branchName) {
    const config = await this.rawRepository.configSnapshot()
    try {
      // We need to await in order for the try/catch to work.
      return await config.getStringBuf(`branch.${branchName}.remote`)
    } catch (e) {
      return null
    }
  }

  fetch (branchName) {
    return this.git.fetch(branchName)
  }

  async pull (branchName) {
    await this.fetch(branchName)
    // TODO: get remote from config
    return this.git.merge(`origin/${branchName}`)
  }

  getAheadCount (branchName) {
    return this.git.getAheadCount(branchName)
  }

  getBehindCount (branchName) {
    return this.git.getBehindCount(branchName)
  }

  // async getAheadBehindCount (branchName) {
  //   const branchRef = await this.rawRepository.getReference(branchName)
  //   const upstreamRef = await Git.Branch.upstream(branchRef)
  //   return Git.Graph.aheadBehind(this.rawRepository, branchRef.target(), upstreamRef.target()) // {ahead, behind}
  // }

  async getPushRefspecs (branchName) {
    const remote = await this.getRemote(branchName)
    const remoteName = await this.getBranchRemoteName(branchName)
    const refspecs = await remote.getPushRefspecs()
    if (refspecs.length) return refspecs

    const branchRef = await this.rawRepository.getReference(branchName)
    const upstreamRef = await Git.Branch.upstream(branchRef)

    // The upstream branch's name takes the form of:
    //   refs/remotes/remote_name/BRANCH_NAME
    // We want only the BRANCH_NAME
    const upstreamBranchName = upstreamRef.name().replace(`refs/remotes/${remoteName}/`, '')
    return [`refs/heads/${branchName}:refs/heads/${upstreamBranchName}`]
  }

  async getRemote (branchName) {
    const remoteName = await this.getBranchRemoteName(branchName)
    return this.rawRepository.getRemote(remoteName)
  }

  async getBranchName () {
    const head = await this.rawRepository.head()
    return head.toString().replace('refs/heads/', '')
  }
}

function readFile (path, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, function (err, content) {
      if (err) {
        reject(err)
      } else {
        resolve(content)
      }
    })
  })
}
