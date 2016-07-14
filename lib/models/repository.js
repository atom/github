/** @babel */

import {Emitter} from 'atom'
import Git from 'nodegit'

import {applyPatch} from 'diff'
import path from 'path'
import fs from 'fs'

import FilePatch from './file-patch'
import Hunk from './hunk'
import HunkLine from './hunk-line'
import MergeConflict from './merge-conflict'

const diffOpts = {flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS}
const findOpts = {flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED}

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
  static async open (workingDirectory) {
    const rawRepository = await Git.Repository.open(workingDirectory.getPath())
    return new Repository(rawRepository, workingDirectory)
  }

  constructor (rawRepository, workingDirectory) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
    this.transactions = []
    this.emitter = new Emitter()
    this.stagedFilePatchesById = new Map()
    this.unstagedFilePatchesById = new Map()
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
      await this.refreshStagedChanges()
      await this.refreshUnstagedChanges()
    })
    this.didUpdate()
  }

  getUnstagedChanges () {
    return this.unstagedChangesPromise || this.refreshUnstagedChanges()
  }

  getStagedChanges () {
    return this.stagedChangesPromise || this.refreshStagedChanges()
  }

  refreshUnstagedChanges () {
    this.unstagedChangesPromise = this.fetchUnstagedChanges()
    return this.unstagedChangesPromise
  }

  refreshStagedChanges () {
    this.stagedChangesPromise = this.fetchStagedChanges()
    return this.stagedChangesPromise
  }

  fetchUnstagedChanges () {
    return this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      const diff = await Git.Diff.indexToWorkdir(this.rawRepository, index, diffOpts)
      await diff.findSimilar(findOpts)
      const validFilePatches = new Set()
      for (let newPatch of await this.buildFilePatchesFromRawDiff(diff)) {
        const id = newPatch.getId()
        const existingPatch = this.unstagedFilePatchesById.get(id)
        if (existingPatch == null) {
          this.unstagedFilePatchesById.set(id, newPatch)
        } else {
          existingPatch.update(newPatch)
        }
        validFilePatches.add(id)
      }

      for (let [id, patch] of this.unstagedFilePatchesById) {
        if (!validFilePatches.has(id)) {
          this.unstagedFilePatchesById.delete(id)
          patch.destroy()
        }
      }

      return Array.from(this.unstagedFilePatchesById.values())
    })
  }

  fetchStagedChanges () {
    return this.autoTransact(async () => {
      const headCommit = await this.rawRepository.getHeadCommit()
      let tree
      if (headCommit) {
        tree = await headCommit.getTree()
      } else {
        const builder = await Git.Treebuilder.create(this.rawRepository, null)
        tree = await this.rawRepository.getTree(builder.write())
      }

      const index = await this.rawRepository.refreshIndex()
      const diff = await Git.Diff.treeToIndex(this.rawRepository, tree, index, diffOpts)
      await diff.findSimilar(findOpts)
      const validFilePatches = new Set()
      for (let newPatch of await this.buildFilePatchesFromRawDiff(diff)) {
        const id = newPatch.getId()
        const existingPatch = this.stagedFilePatchesById.get(id)
        if (existingPatch == null) {
          this.stagedFilePatchesById.set(id, newPatch)
        } else {
          existingPatch.update(newPatch)
        }
        validFilePatches.add(id)
      }

      for (let [id, patch] of this.stagedFilePatchesById) {
        if (!validFilePatches.has(id)) {
          this.stagedFilePatchesById.delete(id)
          patch.destroy()
        }
      }

      return Array.from(this.stagedFilePatchesById.values())
    })
  }

  isMerging () {
    return this.autoTransact(() => this.rawRepository.isMerging())
  }

  async getMergeConflicts () {
    return this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      if (!index.hasConflicts()) return []
      const entries = index.entries()
      const entriesWithConflictsByPath = new Map()
      entries.forEach(entry => {
        if (Git.Index.entryIsConflict(entry)) {
          if (!entriesWithConflictsByPath.has(entry.path)) {
            entriesForPath = entriesWithConflictsByPath.set(entry.path, new Map())
          }
          let entriesForPath = entriesWithConflictsByPath.get(entry.path)
          const stage = Git.Index.entryStage(entry)
          entriesForPath.set(stage, entry)
        }
      })

      const mergeConflicts = []
      entriesWithConflictsByPath.forEach((entries, path) => {
        mergeConflicts.push(new MergeConflict(path, entries.get(1), entries.get(2), entries.get(3)))
      })
      return mergeConflicts
    })
  }

  async addPathToIndex (path) {
    if (typeof path !== 'string') debugger
    await this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      await index.addByPath(path)
      await index.write()

      await this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  async addEntryToIndex (entry) {
    await this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      await index.add(entry)
      await index.write()

      await this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  async getMergeHead () {
    return this.autoTransact(async () => {
      const oid = await readFile(path.join(this.rawRepository.path(), 'MERGE_HEAD'), 'utf8')
      return this.rawRepository.getCommit(oid)
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

  async applyPatchToIndex (filePatch) {
    await this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      if (filePatch.status === 'modified') {
        const oldContents = await this.readFileFromIndex(filePatch.getOldPath())
        const newContents = Buffer.from(applyPatch(oldContents, filePatch.toString()))
        const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
        await index.add(this.buildIndexEntry(newBlobOid, filePatch.getNewMode(), filePatch.getOldPath(), newContents.length))
      } else if (filePatch.status === 'removed') {
        await index.remove(filePatch.getOldPath(), 0)
      } else if (filePatch.status === 'renamed') {
        const oldContents = await this.readFileFromIndex(filePatch.getOldPath())
        const newContents = Buffer.from(applyPatch(oldContents, filePatch.toString()))
        const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
        await index.remove(filePatch.getOldPath(), 0)
        await index.add(this.buildIndexEntry(newBlobOid, filePatch.getNewMode(), filePatch.getNewPath(), newContents.length))
      } else if (filePatch.status === 'added') {
        const newContents = Buffer.from(applyPatch('', filePatch.toString()))
        const newBlobOid = await this.rawRepository.createBlobFromBuffer(newContents)
        await index.add(this.buildIndexEntry(newBlobOid, filePatch.getNewMode(), filePatch.getNewPath(), newContents.length))
      }

      await index.write()
      await this.refreshUnstagedChanges()
      await this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  async commit (message) {
    await this.autoTransact(async () => {
      const head = await this.rawRepository.getHeadCommit()
      const isMerging = await this.isMerging()
      let parents
      if (isMerging) {
        const conflicts = await this.getMergeConflicts()
        if (conflicts.length > 0) {
          throw new CommitError('ECONFLICT')
        } else if (head == null) {
          throw new CommitError('ENOHEAD')
        } else {
          parents = [head, await this.getMergeHead()]
        }
      } else {
        parents = head ? [head] : null
      }
      const index = await this.rawRepository.refreshIndex()
      const indexTree = await index.writeTree()
      const author = Git.Signature.default(this.rawRepository)
      await this.rawRepository.createCommit('HEAD', author, author, this.formatCommitMessage(message), indexTree, parents)
      if (isMerging) {
        await removeFileIfExists(path.join(this.rawRepository.path(), 'MERGE_HEAD'))
        await removeFileIfExists(path.join(this.rawRepository.path(), 'MERGE_BASE'))
        await removeFileIfExists(path.join(this.rawRepository.path(), 'MERGE_MSG'))
      }
      await this.refreshStagedChanges()
    })
    this.didUpdate()
  }

  getLastCommit () {
    return this.autoTransact(() => this.rawRepository.getHeadCommit())
  }

  formatCommitMessage (message) {
    const matches = message.match(/.{1,72}(\s|$)|\S+?(\s|$)/g)
    return matches == null ? message : matches.join('\n')
  }

  readFileFromIndex (path) {
    return this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      const indexEntry = await index.getByPath(path, 0)
      const blob = await this.rawRepository.getBlob(indexEntry.id)
      return blob.toString()
    })
  }

  buildIndexEntry (oid, mode, path, fileSize) {
    const entry = new Git.IndexEntry()
    entry.id = oid
    entry.mode = mode
    entry.path = path
    entry.fileSize = fileSize
    entry.flags = 0
    entry.flagsExtended = 0
    return entry
  }

  async buildFilePatchesFromRawDiff (rawDiff) {
    const filePatches = []
    for (let rawPatch of await rawDiff.patches()) {
      const hunks = []
      for (let rawHunk of await rawPatch.hunks()) { // eslint-disable-line babel/no-await-in-loop
        const lines = []
        for (let rawLine of await rawHunk.lines()) { // eslint-disable-line babel/no-await-in-loop
          let text = rawLine.content()
          const origin = String.fromCharCode(rawLine.origin())
          let status
          if (origin === '+') {
            status = 'added'
          } else if (origin === '-') {
            status = 'removed'
          } else if (origin === ' ') {
            status = 'unchanged'
          }

          lines.push(new HunkLine(text, status, rawLine.oldLineno(), rawLine.newLineno()))
        }
        hunks.push(new Hunk(rawHunk.oldStart(), rawHunk.newStart(), rawHunk.oldLines(), rawHunk.newLines(), lines))
      }

      let status
      if (rawPatch.isUntracked() || rawPatch.isAdded()) {
        status = 'added'
      } else if (rawPatch.isModified()) {
        status = 'modified'
      } else if (rawPatch.isDeleted()) {
        status = 'removed'
      } else if (rawPatch.isRenamed()) {
        status = 'renamed'
      } else if (rawPatch.isConflicted()) {
        status = 'conflicted'
      } else {
        throw new Error('Unknown status for raw patch')
      }

      if (status !== 'conflicted') {
        const oldMode = rawPatch.oldFile().mode()
        const newMode = rawPatch.newFile().mode()
        filePatches.push(new FilePatch(
          oldMode === 0 ? null : rawPatch.oldFile().path(),
          newMode === 0 ? null : rawPatch.newFile().path(),
          oldMode,
          newMode,
          status,
          hunks
        ))
      }
    }

    return filePatches
  }

  async push (branchName) {
    const remote = await this.getRemote(branchName)
    const refspecs = await this.getPushRefspecs(branchName)
    return remote.push(refspecs)
  }

  getBranchRemoteName (branchName) {
    return this.autoTransact(async () => {
      const remotes = await this.rawRepository.getRemotes()
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
