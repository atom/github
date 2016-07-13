/** @babel */

import {GitRepositoryAsync, Emitter, File} from 'atom'
const Git = GitRepositoryAsync.Git

import FilePatch from './file-patch'
import Hunk from './hunk'
import HunkLine from './hunk-line'

import {applyPatch} from 'diff'

const diffOpts = {flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS}
const findOpts = {flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED}

export default class Repository {
  constructor (rawRepository, workingDirectory) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
    this.emitter = new Emitter()
    this.stagedFilePatchesById = new Map()
    this.unstagedFilePatchesById = new Map()
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
    await this.refreshStagedChanges()
    await this.refreshUnstagedChanges()
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

  async fetchUnstagedChanges () {
    const index = await this.rawRepository.index()
    await index.read(1)
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
  }

  async fetchStagedChanges () {
    const headCommit = await this.rawRepository.getHeadCommit()
    let tree
    if (headCommit) {
      tree = await headCommit.getTree()
    } else {
      const builder = await Git.Treebuilder.create(this.rawRepository, null)
      tree = await this.rawRepository.getTree(builder.write())
    }

    const index = await this.rawRepository.index()
    await index.read(1)
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
  }

  async hasMergeConflict () {
    const index = await this.rawRepository.index()
    return index.hasConflicts()
  }

  async getMergeConflictPaths () {
    if (!this.hasMergeConflict()) return []
    const index = await this.rawRepository.index()
    await index.read(1) // is this necessary?
    const entries = index.entries()
    const entriesWithConflicts = new Set()
    entries.forEach(entry => {
      if (Git.Index.entryIsConflict(entry)) {
        entriesWithConflicts.add(entry.path)
      }
    })
    return Array.from(entriesWithConflicts.values()).sort()
  }

  async resolveMergeConflictForFilePath (filePath) {
    await this.stageResolvedFile(filePath)
    return this.removeConflictFileFromIndex(filePath)
  }

  async stageResolvedFile (filePath) {
    // docs recommend using https://github.com/nodegit/nodegit/blob/master/examples/merge-with-conflicts.js#L183
    const index = await this.rawRepository.refreshIndex()
    await index.addByPath(filePath)
    await index.write()

    await this.refreshStagedChanges()
    this.didUpdate()
  }

  async applyPatchToIndex (filePatch) {
    const index = await this.rawRepository.index()
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
    this.didUpdate()
  }

  async commit (message) {
    const index = await this.rawRepository.index()
    const indexTree = await index.writeTree()
    const head = await this.rawRepository.getHeadCommit()
    const parents = head ? [head] : null
    const author = Git.Signature.default(this.rawRepository)
    await this.rawRepository.createCommit('HEAD', author, author, this.formatCommitMessage(message), indexTree, parents)
    await this.refreshStagedChanges()
    this.didUpdate()
  }

  async getLastCommitMessage () {
    const head = await this.rawRepository.getHeadCommit()
    return head.message()
  }

  formatCommitMessage (message) {
    const matches = message.match(/.{1,72}(\s|$)|\S+?(\s|$)/g)
    return matches == null ? message : matches.join('\n')
  }

  async readFileFromIndex (path) {
    const index = await this.rawRepository.index()
    const indexEntry = await index.getByPath(path, 0)
    const blob = await this.rawRepository.getBlob(indexEntry.id)
    return blob.toString()
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
        filePatches.push(new FilePatch(
          rawPatch.oldFile().path(),
          rawPatch.newFile().path(),
          rawPatch.oldFile().mode(),
          rawPatch.newFile().mode(),
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

  async getBranchRemoteName (branchName) {
    const remotes = await this.rawRepository.getRemotes()
    if (remotes.length === 0) return null
    const config = await this.rawRepository.configSnapshot()
    return config.getStringBuf(`branch.${branchName}.remote`)
  }

  async fetch (branchName) {
    const remote = await this.getRemote(branchName)
    return remote.fetch(null)
  }

  async pull (branchName) {
    await this.fetch(branchName)

    const branchRef = await this.rawRepository.getReference(branchName)
    const upstreamRef = await Git.Branch.upstream(branchRef)
    await this.rawRepository.mergeBranches(branchRef, upstreamRef)
  }

  async getAheadBehindCount (branchName) {
    const branchRef = await this.rawRepository.getReference(branchName)
    const upstreamRef = await Git.Branch.upstream(branchRef)
    return Git.Graph.aheadBehind(this.rawRepository, branchRef.target(), upstreamRef.target()) // {ahead, behind}
  }

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
