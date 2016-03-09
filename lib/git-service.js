/* @flow */

import {GitRepositoryAsync, CompositeDisposable, Disposable, Emitter} from 'atom'
import {applyPatch} from 'diff'
import PatchWatcher from 'pathwatcher'
import Git from './git'

import type {ConvenientPatch, Diff, Oid, IndexEntry, StatusFile} from 'nodegit'
import type FileDiff from './file-diff'
import type DiffHunk from './diff-hunk'
import type HunkLine from './hunk-line'
import type {ObjectMap} from './common'

type DiffState = 'all' | 'staged' | 'unstaged'

type Diffs = {
  all: Diff,
  staged: Diff,
  unstaged: Diff
}

export default class GitService {
  repoPath: string;
  diffsPromise: Promise<Diffs>;
  statuses: ObjectMap<StatusFile>;
  gitRepo: GitRepositoryAsync;
  subscriptions: CompositeDisposable;
  emitter: Emitter;

  constructor (gitRepo: GitRepositoryAsync) {
    this.subscriptions = new CompositeDisposable()
    this.emitter = new Emitter()
    this.statuses = {}

    this.gitRepo = gitRepo
    this.repoPath = gitRepo.openedPath

    this.subscriptions.add(gitRepo.onDidChangeStatus(() => this.didChange()))
    this.subscriptions.add(gitRepo.onDidChangeStatuses(() => this.didChange()))

    this.gitRepo.getPath().then(p => {
      const watcher = PatchWatcher.watch(p, () => this.didChange())
      this.subscriptions.add(new Disposable(() => watcher.close()))
    })
  }

  onDidChange (fn: Function): Disposable {
    return this.emitter.on('did-change', fn)
  }

  didChange () {
    this.emitter.emit('did-change')
  }

  destroy () {
    this.subscriptions.dispose()
  }

  getCurrentBranchName (): Promise<string> {
    return this.gitRepo.getShortHead()
  }

  getDiffs (state: DiffState): Promise<Array<ConvenientPatch>> {
    return this.diffsPromise.then(diffs => diffs[state].patches())
  }

  gatherDiffs (): Promise<Diffs> {
    const data = {}

    const diffOpts = {
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS
    }

    const findOpts = {
      flags: Git.Diff.FIND.RENAMES | Git.Diff.FIND.FOR_UNTRACKED
    }

    this.diffsPromise = Git.Repository
      .open(this.repoPath)
      .then(repo => {
        data.repo = repo
        return data.repo.openIndex()
      })
      .then(index => {
        data.index = index
        return Git.Diff.indexToWorkdir(data.repo, data.index, diffOpts)
      })
      .then(unstagedDiffs => {
        data.unstagedDiffs = unstagedDiffs
        return unstagedDiffs.findSimilar(findOpts)
      })
      .then(() => {
        return !data.repo.isEmpty() ? data.repo.getHeadCommit() : null
      })
      .then(commit => {
        return commit ? commit.getTree() : null
      })
      .then(tree => {
        data.tree = tree
        return Git.Diff.treeToIndex(data.repo, tree, data.index, diffOpts)
      })
      .then(stagedDiffs => {
        data.stagedDiffs = stagedDiffs
        return stagedDiffs.findSimilar(findOpts)
      })
      .then(() => {
        return Git.Diff.treeToWorkdirWithIndex(data.repo, data.tree, diffOpts)
      })
      .then(allDiffs => {
        data.allDiffs = allDiffs
        return allDiffs.findSimilar(findOpts)
      })
      .then(() => {
        return {
          all: data.allDiffs,
          staged: data.stagedDiffs,
          unstaged: data.unstagedDiffs
        }
      })

    return this.diffsPromise
  }

  getStatuses (): Promise<ObjectMap<StatusFile>> {
    const opts = {
      flags: Git.Status.OPT.INCLUDE_UNTRACKED | Git.Status.OPT.RECURSE_UNTRACKED_DIRS | Git.Status.OPT.RENAMES_INDEX_TO_WORKDIR | Git.Status.OPT.RENAMES_HEAD_TO_INDEX
    }

    this.gatherDiffs()

    return Git.Repository
      .open(this.repoPath)
      .then(repo => repo.getStatusExt(opts))
      .then(statuses => {
        this.statuses = {}
        for (let status of statuses) {
          this.statuses[status.path()] = status
        }

        return this.statuses
      })
  }

  getStatus (path: string): StatusFile {
    return this.statuses[path]
  }

  stagePath (path: string): Promise<number> {
    return this.stageAllPaths([path])
  }

  stageAllPaths (paths: Array<string>): Promise<number> {
    return Git.Repository
      .open(this.repoPath)
      .then(repo => repo.openIndex())
      .then(index => {
        for (let path of paths) {
          const status = this.statuses[path]

          if (status.isDeleted()) {
            index.removeByPath(path)
          } else if (status.isRenamed()) {
            index.removeByPath(status.indexToWorkdir().oldFile().path())
            index.addByPath(path)
          } else {
            index.addByPath(path)
          }
        }

        return index.write()
      })
  }

  unstagePath (path: string): Promise<number> {
    return this.unstageAllPaths([path])
  }

  unstageAllPaths (paths: Array<string>): Promise<number> {
    const data = {}

    return Git.Repository.open(this.repoPath).then(repo => {
      data.repo = repo

      if (repo.isEmpty()) {
        return repo.openIndex().then(index => {
          for (let path of paths) {
            index.removeByPath(path)
          }

          return index.write()
        })
      } else {
        return repo.getHeadCommit().then(commit => {
          const promises = []
          for (let path of paths) {
            const status = this.statuses[path]
            if (status.isRenamed()) {
              const oldFilePath = status.headToIndex().oldFile().path()
              promises.push(Git.Reset.default(data.repo, commit, oldFilePath))
              promises.push(Git.Reset.default(data.repo, commit, path))
            } else {
              promises.push(Git.Reset.default(data.repo, commit, path))
            }
          }

          return Promise.all(promises).then(() => 0)
        })
      }
    })
  }

  wordwrap (str: ?string): ?string {
    if (!str) return str

    const matches = str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g)
    if (!matches) return str

    return matches.join('\n')
  }

  commit (message: string): Promise<Oid> {
    const data = {}

    return Git.Repository
      .open(this.repoPath)
      .then(repo => {
        data.repo = repo
        return repo.openIndex()
      })
      .then(index => {
        data.index = index
        return index.writeTree()
      })
      .then(indexTree => {
        data.indexTree = indexTree
        return data.repo.getHeadCommit()
      })
      .catch(() => {
        data.parent = null
        return null
      })
      .then(parent => {
        const parents = parent ? [parent] : null
        const author = Git.Signature.default(data.repo)
        return data.repo.createCommit('HEAD', author, author, this.wordwrap(message) || '', data.indexTree, parents)
      })
  }

  _parseHeader (header: string): {oldStart: number, oldCount: number, newStart: number, newCount: number, context: string} {
    const headerParts = header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)

    if (!headerParts) {
      return {oldStart: -1, oldCount: -1, newStart: -1, newCount: -1, context: ''}
    }

    return {
      oldStart: parseInt(headerParts[1], 10),
      oldCount: parseInt(headerParts[2], 10),
      newStart: parseInt(headerParts[3], 10),
      newCount: parseInt(headerParts[4], 10),
      context: headerParts[5]
    }
  }

  calculatePatchTexts (selectedLinesByHunk: ObjectMap<{linesToStage: Array<HunkLine>, linesToUnstage: Array<HunkLine>}>, stage: boolean): Promise<Array<string>> {
    let offset = 0
    const patches = []

    for (let hunkString in selectedLinesByHunk) {
      const {linesToStage, linesToUnstage} = selectedLinesByHunk[hunkString]

      const linesToUse = (linesToStage.length > 0 ? linesToStage : linesToUnstage)
      const hunk = linesToUse[0].hunk
      const result = this._calculatePatchText(hunk, linesToUse, offset, stage)
      offset += result.offset
      patches.push(result.patchText)
    }

    return Promise.resolve(patches)
  }

  _calculatePatchText (hunk: DiffHunk, selectedLines: Array<HunkLine>, offset: number, stage: boolean): {patchText: string, offset: number} {
    const header = hunk.getHeader()

    let {oldStart, context} = this._parseHeader(header)

    oldStart += offset
    let newStart = oldStart
    let newCount = 0
    let oldCount = 0
    const hunkLines = hunk.getLines()
    const patchLines = []

    for (let line of hunkLines) {
      const selected = selectedLines.some(selectedLine => {
        if (line.isAddition()) {
          return line.getNewLineNumber() === selectedLine.getNewLineNumber()
        } else if (line.isDeletion()) {
          return line.getOldLineNumber() === selectedLine.getOldLineNumber()
        } else {
          return false
        }
      })

      const content = line.getContent()
      const origin = line.getLineOrigin()

      switch (origin) {
        case ' ':
          oldCount++
          newCount++
          patchLines.push(`${origin}${content}`)
          break
        case '+':
          if (selected) {
            newCount++
            patchLines.push(`${origin}${content}`)
          } else if (!stage) {
            oldCount++
            newCount++
            patchLines.push(` ${content}`)
          }
          break
        case '-':
          if (selected) {
            oldCount++
            patchLines.push(`${origin}${content}`)
          } else if (stage) {
            oldCount++
            newCount++
            patchLines.push(` ${content}`)
          }
          break
        case '<':
          patchLines.push('\\ No newline at end of file\n')
          break
        default:
          throw new Error('Unhandled line origin: ' + origin)
      }
    }

    if (oldCount > 0 && oldStart === 0) oldStart = 1
    if (newCount > 0 && newStart === 0) newStart = 1
    const newHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${context}\n`
    const patchText = `${newHeader}${patchLines.join('\n')}\n`

    return {
      patchText: patchText,
      offset: newCount - oldCount
    }
  }

  stagePatches (fileDiff: FileDiff, patches: Array<string>): Promise<number> {
    const data = {}
    const oldPath = fileDiff.getOldPathName()
    const newPath = fileDiff.getNewPathName()

    return Git.Repository
      .open(this.repoPath)
      .then(repo => {
        data.repo = repo
        return repo.openIndex()
      })
      .then(index => {
        data.index = index
        // $FlowSilence: If it's tracked then we know it has an old path name.
        return !fileDiff.isUntracked() ? this._indexBlob(oldPath) : null
      })
      .then(content => {
        let newContent = content || ''
        for (let patchText of patches) {
          newContent = applyPatch(newContent, patchText)
        }

        const buffer = new Buffer(newContent)
        const oid = data.repo.createBlobFromBuffer(buffer)

        if (fileDiff.isDeleted()) {
          // If we the file was deleted then we're guaranteed that `oldPath`
          // isn't null.
          // $FlowSilence
          data.index.removeByPath(oldPath)
        } else {
          const entry = this._createIndexEntry({
            oid: oid,
            // If we're not deleted then we know it has a new path name.
            // $FlowSilence
            path: newPath,
            fileSize: buffer.length,
            mode: fileDiff.getMode()
          })

          // $FlowFixMe: Unclear whether this is legit.
          if (oldPath !== newPath) data.index.removeByPath(oldPath)

          data.index.add(entry)
        }

        return data.index.write()
      })
      .catch(error => {
        console.log(error.message)
        return console.log(error.stack)
      })
  }

  unstagePatches (fileDiff: FileDiff, patches: Array<string>): Promise<number> {
    const data = {}
    const newPath = fileDiff.getNewPathName()

    return Git.Repository
      .open(this.repoPath).then(repo => {
        data.repo = repo
        return repo.openIndex()
      })
      .then(index => {
        data.index = index
        // Unclear whether we can justifiably assume `newPath` isn't null.
        // $FlowFixMe
        const entry = index.getByPath(newPath, 0)
        if (entry) {
          return data.repo.getBlob(entry.id).then(blob => {
            if (blob) {
              return blob.toString()
            } else {
              return null
            }
          })
        } else {
          return null
        }
      })
      .then(content => {
        let newContent = content || ''
        for (let patchText of patches) {
          patchText = this._reversePatch(patchText)
          newContent = applyPatch(newContent, patchText)
        }

        if (!newContent && fileDiff.isAdded()) {
          // If the file's been added then we know it has a new path.
          // $FlowSilence
          return this.unstagePath(newPath)
        } else {
          const buffer = new Buffer(newContent)
          const oid = data.repo.createBlobFromBuffer(buffer)
          const entry = this._createIndexEntry({
            oid: oid,
            // Unclear whether we can justifiably assume `newPath` isn't null.
            // $FlowFixMe
            path: newPath,
            fileSize: buffer.length,
            mode: fileDiff.getMode()
          })
          data.index.add(entry)
          return data.index.write()
        }
      })
  }

  _createIndexEntry ({oid, path, fileSize, mode}: {oid: Oid, path: string, fileSize: number, mode: number}): IndexEntry {
    const entry = new Git.IndexEntry()
    entry.id = oid
    entry.mode = mode
    entry.path = path
    entry.fileSize = fileSize
    entry.flags = 0
    entry.flagsExtended = 0
    return entry
  }

  _reversePatch (patch: string): string {
    const lines = patch.split('\n')
    const header = lines.shift()
    // $FlowSilence: We assume we're given a valid patch.
    const headerParts = header.match(/^@@ \-([^\s]+) \+([^\s]+) @@(.*)$/)
    const newHeader = `@@ -${headerParts[2]} +${headerParts[1]} @@${headerParts[3]}`

    const newLines = lines.map(line => {
      const origin = line[0]
      const content = line.substr(1)

      switch (origin) {
        case '+':
          return `-${content}`
        case '-':
          return `+${content}`
        default:
          return line
      }
    })

    newLines.unshift(newHeader)
    return newLines.join('\n')
  }

  _indexBlob (path: string): Promise<?string> {
    const data = {}

    return Git.Repository
      .open(this.repoPath)
      .then(repo => {
        data.repo = repo
        return repo.openIndex()
      })
      .then(index => {
        const entry = index.getByPath(path, 0)
        if (entry) {
          return data.repo.getBlob(entry.id).then(blob => {
            if (blob) {
              return blob.toString()
            } else {
              return null
            }
          })
        } else {
          return this._treeBlob(path)
        }
      })
  }

  _treeBlob (path: string, sha?: string): Promise<string> {
    return Git.Repository
      .open(this.repoPath)
      .then(repo => {
        return (sha ? repo.getCommit(sha) : repo.getHeadCommit())
      })
      .then(commit => commit.getTree())
      .then(tree => tree.getEntry(path))
      .then(entry => {
        if (entry) {
          return entry.getBlob().then(blob => {
            if (blob) {
              return blob.toString()
            } else {
              return ''
            }
          })
        } else {
          return ''
        }
      })
  }
}
