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
    this.transactions = []
    this.emitter = new Emitter()
    this.stagedFilePatchesById = new Map()
    this.unstagedFilePatchesById = new Map()
    this.mergeConflictsByPath = new Map()
    this.git = gitStrategy || new GitShellOutStrategy(workingDirectory.getPath())
  }

  destroy () {
    this.emitter.dispose()
    this.rawRepository = null
  }

  async transact (criticalSection) {
    return new Promise((resolve, reject) => {
      this.transactions.push({criticalSection, resolve, reject})
      if (this.transactions.length === 1) {
        this.processTransactions()
      }
    })
  }

  async processTransactions () {
    while (this.transactions.length > 0) {
      const {criticalSection, resolve, reject} = this.transactions[0]
      try {
        resolve(await criticalSection())
      } catch (e) {
        reject(e)
      } finally {
        this.transactions.shift()
      }
    }
  }

  autoTransact (fn) {
    return this.transactions.length > 0 ? fn() : this.transact(fn)
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
    return this.autoTransact(() => this.rawRepository.path())
  }

  async refresh () {
    await this.autoTransact(async () => {
      if (global.profile) console.time('refresh')
      await this.refreshStagedChanges()
      await this.refreshUnstagedChanges()
      await this.refreshMergeConflicts()
      if (global.profile) console.timeEnd('refresh')
    })
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

  fetchUnstagedChanges () {
    return this.autoTransact(async () => {
      const rawDiffs = await this.git.diff()
      return this.buildFilePatchesFromRawDiffs(rawDiffs)
    })
  }

  fetchStagedChanges () {
    return this.autoTransact(async () => {
      const rawDiffs = await this.git.diff({staged: true})
      return this.buildFilePatchesFromRawDiffs(rawDiffs)
    })
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

  fetchMergeConflicts () {
    return this.autoTransact(async () => {
      const statusesByPath = await this.git.getMergeConflictFileStatus()
      return Object.keys(statusesByPath).map(path => {
        const statuses = statusesByPath[path]
        return new MergeConflict(path, statuses.ours, statuses.theirs, statuses.file)
      })
    })
  }

  async stageFile (...paths) {
    return this.autoTransact(async () => {
      await Promise.all(paths.map(path => this.git.stageFile(path)))
      await this.refresh()
    })
  }

  async unstageFile (...paths) {
    return this.autoTransact(async () => {
      await Promise.all(paths.map(path => this.git.unstageFile(path)))
      await this.refresh()
    })
  }

  async applyPatchToIndex (filePatch) {
    await this.autoTransact(async () => {
      const patchStr = filePatch.getHeaderString() + filePatch.toString()
      await this.git.applyPatchToIndex(patchStr)
      await this.refreshUnstagedChanges()
      await this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  async pathHasMergeMarkers (relativePath) {
    try {
      const contents = await readFile(path.join(this.rawRepository.path().replace('.git', ''), relativePath), 'utf8')
      return MERGE_MARKER_REGEX.test(contents)
    } catch (e) {
      if (e.code === 'ENOENT') return false
      else throw e
    }
  }

  async getMergeHead () {
    return this.autoTransact(async () => {
      return this.git.getMergeHead()
    })
  }

  getMergeMessage () {
    return this.autoTransact(async () => {
      try {
        const contents = await readFile(path.join(this.rawRepository.path(), 'MERGE_MSG'), 'utf8')
        return contents
      } catch (e) {
        return null
      }
    })
  }

  async abortMerge () {
    await this.autoTransact(async () => {
      const unstagedPaths = new Set()
      const pathsToCheckout = new Set((await this.getMergeConflicts()).map(c => c.getPath()))
      for (let filePatch of await this.refreshUnstagedChanges()) {
        if (filePatch.getOldPath()) unstagedPaths.add(filePatch.getOldPath())
        if (filePatch.getNewPath()) unstagedPaths.add(filePatch.getNewPath())
      }
      for (let filePatch of await this.refreshStagedChanges()) {
        if (unstagedPaths.has(filePatch.getOldPath()) || unstagedPaths.has(filePatch.getNewPath())) {
          throw new AbortMergeError('EDIRTYSTAGED', filePatch.getDescriptionPath())
        } else {
          if (filePatch.getOldPath()) pathsToCheckout.add(filePatch.getOldPath())
          if (filePatch.getNewPath()) pathsToCheckout.add(filePatch.getNewPath())
        }
      }
      const head = await this.rawRepository.getHeadCommit()
      await Git.Reset.reset(this.rawRepository, head, Git.Reset.TYPE.MIXED)
      const checkoutOptions = new Git.CheckoutOptions()
      checkoutOptions.checkoutStrategy =
        Git.Checkout.STRATEGY.FORCE |
        Git.Checkout.STRATEGY.DONT_UPDATE_INDEX |
        Git.Checkout.STRATEGY.REMOVE_UNTRACKED
      checkoutOptions.paths = Array.from(pathsToCheckout)
      await Git.Checkout.head(this.rawRepository, checkoutOptions)
    })
    this.didUpdate()
  }

  async hasMergeConflict () {
    return this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      return (await index.hasConflicts()) === 1
    })
  }

  isMerging () {
    return this.autoTransact(() => this.rawRepository.isMerging())
  }

  async commit (message) {
    await this.autoTransact(async () => {
      await this.git.commit(this.stripCommitComments(message))
      return this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  getLastCommit () {
    return this.autoTransact(() => this.git.getHeadCommit())
  }

  stripCommitComments (message) {
    return message.replace(/^#.*$/mg, '').trim()
  }

  readFileFromIndex (path) {
    return this.autoTransact(async () => {
      return this.git.readFileFromIndex(path)
    })
  }

  async push (branchName) {
    const remote = await this.getRemote(branchName)
    const refspecs = await this.getPushRefspecs(branchName)
    return remote.push(refspecs)
  }

  getBranchRemoteName (branchName) {
    return this.autoTransact(async () => {
      const config = await this.rawRepository.configSnapshot()
      try {
        // We need to await in order for the try/catch to work.
        return await config.getStringBuf(`branch.${branchName}.remote`)
      } catch (e) {
        return null
      }
    })
  }

  fetch (branchName) {
    return this.autoTransact(async () => {
      const remote = await this.getRemote(branchName)
      return remote.fetch(null)
    })
  }

  pull (branchName) {
    return this.autoTransact(async () => {
      await this.fetch(branchName)
      const branchRef = await this.rawRepository.getReference(branchName)
      const upstreamRef = await Git.Branch.upstream(branchRef)
      await this.rawRepository.mergeBranches(branchRef, upstreamRef)
    })
  }

  getAheadBehindCount (branchName) {
    return this.autoTransact(async () => {
      const branchRef = await this.rawRepository.getReference(branchName)
      const upstreamRef = await Git.Branch.upstream(branchRef)
      return Git.Graph.aheadBehind(this.rawRepository, branchRef.target(), upstreamRef.target()) // {ahead, behind}
    })
  }

  getPushRefspecs (branchName) {
    return this.autoTransact(async () => {
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
    })
  }

  getRemote (branchName) {
    return this.autoTransact(async () => {
      const remoteName = await this.getBranchRemoteName(branchName)
      return this.rawRepository.getRemote(remoteName)
    })
  }

  getBranchName () {
    return this.autoTransact(async () => {
      const head = await this.rawRepository.head()
      return head.toString().replace('refs/heads/', '')
    })
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

async function removeFileIfExists (path) {
  try {
    await removeFile(path)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
}

function removeFile (path) {
  return new Promise((resolve, reject) => {
    fs.unlink(path, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
