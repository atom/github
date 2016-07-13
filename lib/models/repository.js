/** @babel */

import {GitRepositoryAsync, Emitter} from 'atom'
const Git = GitRepositoryAsync.Git

import {applyPatch} from 'diff'
import path from 'path'
import fs from 'fs'

import FilePatch from './file-patch'
import Hunk from './hunk'
import HunkLine from './hunk-line'

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
  constructor (rawRepositoryPool, workingDirectory) {
    this.rawRepositoryPool = rawRepositoryPool
    this.workingDirectory = workingDirectory
    this.rawRepository = null
    this.emitter = new Emitter()
    this.stagedFilePatchesById = new Map()
    this.unstagedFilePatchesById = new Map()
  }

  transact (fn) {
    if (this.rawRepository) throw new Error('A transaction is already started. Nested transactions are not supported.')

    return this.rawRepositoryPool.enqueue(async (rawRepositoryPromise) => {
      try {
        this.rawRepository = await rawRepositoryPromise
        let result = await fn()
        return result
      } finally {
        this.rawRepository = null
      }
    })
  }

  autoTransact (fn) {
    if (this.rawRepository) {
      return fn(this.rawRepository)
    } else {
      return this.transact(() => fn(this.rawRepository))
    }
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

  async getMergeConflictPaths () {
    return this.autoTransact(async () => {
      const index = await this.rawRepository.refreshIndex()
      if (!index.hasConflicts()) return []
      const entries = index.entries()
      const entriesWithConflicts = new Set()
      entries.forEach(entry => {
        if (Git.Index.entryIsConflict(entry)) {
          entriesWithConflicts.add(entry.path)
        }
      })
      return Array.from(entriesWithConflicts.values()).sort()
    })
  }

  async stageResolvedPath (filePath) {
    await this.autoTransact(async () => {
      // docs recommend using https://github.com/nodegit/nodegit/blob/master/examples/merge-with-conflicts.js#L183
      const index = await this.rawRepository.refreshIndex()
      await index.addByPath(filePath)
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
      const mergeConflictPaths = await this.getMergeConflictPaths()
      const unstagedPathSet = new Set((await this.refreshUnstagedChanges()).map(p => p.getNewPath()))
      const stagedPaths = (await this.refreshStagedChanges()).map(p => p.getNewPath())
      for (let path of stagedPaths) {
        if (unstagedPathSet.has(path)) {
          throw new AbortMergeError('EDIRTYSTAGED', path)
        }
      }
      const head = await this.rawRepository.getHeadCommit()
      await Git.Reset.reset(this.rawRepository, head, Git.Reset.TYPE.MIXED)
      const checkoutOptions = new Git.CheckoutOptions()
      checkoutOptions.checkoutStrategy = Git.Checkout.STRATEGY.FORCE | Git.Checkout.STRATEGY.DONT_UPDATE_INDEX
      checkoutOptions.paths = mergeConflictPaths.concat(stagedPaths)
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
        const conflictPaths = await this.getMergeConflictPaths()
        if (conflictPaths.length > 0) {
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
