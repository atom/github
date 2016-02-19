/** @babel */

import {GitRepositoryAsync} from 'atom'
const Git = GitRepositoryAsync.Git

import _ from 'underscore-contrib'
import JsDiff from 'diff'

let instance = null

export default class GitService {
  // Sorry about the singleton, but there is no need to pass this thing around all over the place
  static instance () {
    if (!instance) instance = new GitService()
    return instance
  }

  constructor () {
    this.statuses = {}
    this.repoPath = atom.project.getPaths()[0]
    this.stagePatches.bind(this)
    this.unstagePatches.bind(this)
  }

  getDiffForPath (path, state) {
    return this.getDiffs(state).then(diffs => {
      return diffs.then(patchList => {
        return _.find(patchList, patch => patch.newFile().path() === path)
      })
    })
  }

  getDiffs (state) {
    return this.diffsPromise.then(diffs => diffs[state].patches())
  }

  gatherDiffs () {
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

  getStatuses () {
    const opts = {
      flags: Git.Status.OPT.INCLUDE_UNTRACKED | Git.Status.OPT.RECURSE_UNTRACKED_DIRS | Git.Status.OPT.RENAMES_INDEX_TO_WORKDIR | Git.Status.OPT.RENAMES_HEAD_TO_INDEX
    }

    this.gatherDiffs()

    return Git.Repository
      .open(this.repoPath)
      .then(repo => repo.getStatusExt(opts))
      .then(statuses => {
        for (let status in statuses) {
          this.statuses[status.path()] = status
        }

        return statuses
      })
  }

  stagePath (path) {
    return this.stageAllPaths([path])
  }

  stageAllPaths (paths) {
    return Git.Repository
      .open(this.repoPath)
      .then(repo => repo.openIndex())
      .then(index => {
        for (let path in paths) {
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

  unstagePath (path) {
    return this.unstageAllPaths([path])
  }

  unstageAllPaths (paths) {
    const data = {}

    return Git.Repository.open(this.repoPath).then(repo => {
      data.repo = repo

      if (repo.isEmpty()) {
        return repo.openIndex().then(index => {
          for (let path in paths) {
            index.removeByPath(path)
          }

          return index.write()
        })
      } else {
        return repo.getHeadCommit().then(commit => {
          for (let path in paths) {
            const status = this.statuses[path]
            // TODO: This is messed up. We aren't accumulating all the promises.
            if (status.isRenamed()) {
              Git.Reset.default(data.repo, commit, status.headToIndex().oldFile().path())
            } else {
              Git.Reset.default(data.repo, commit, path)
            }
          }
        })
      }
    })
  }

  wordwrap (str) {
    if (!str.length) {
      return str
    }

    return str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join('\\n')
  }

  commit (message) {
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
        const parents = (typeof parent !== 'undefined' && parent !== null ? [parent] : null)
        const author = Git.Signature.default(data.repo)
        return data.repo.createCommit('HEAD', author, author, this.wordwrap(message), data.indexTree, parents)
      })
  }

  _parseHeader (header) {
    const headerParts = header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)

    if (!headerParts) {
      return false
    }

    return {
      oldStart: parseInt(headerParts[1], 10),
      oldCount: parseInt(headerParts[2], 10),
      newStart: parseInt(headerParts[3], 10),
      newCount: parseInt(headerParts[4], 10),
      context: headerParts[5]
    }
  }

  calculatePatchTexts (selectedLinesByHunk, stage) {
    let offset = 0
    const patches = []

    for (let [hunkString] in Object.entries(selectedLinesByHunk)) {
      const {linesToStage, linesToUnstage} = selectedLinesByHunk[hunkString]

      const linesToUse = (linesToStage.length > 0 ? linesToStage : linesToUnstage)
      const hunk = linesToUse[0].hunk
      const result = this._calculatePatchText(hunk, linesToUse, offset, stage)
      offset += result.offset
      patches.push(result.patchText)
    }

    return Promise.resolve(patches)
  }

  _calculatePatchText (hunk, selectedLines, offset, stage) {
    const header = hunk.getHeader()

    let {oldStart, context} = this._parseHeader(header)

    oldStart += offset
    let newStart = oldStart
    let newCount = 0
    let oldCount = 0
    const hunkLines = hunk.getLines()
    const patchLines = []

    for (let line in hunkLines) {
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
          patchLines.push(('' + (origin) + (content)))
          break
        case '+':
          if (selected) {
            newCount++
            patchLines.push(('' + (origin) + (content)))
          } else if (!stage) {
            oldCount++
            newCount++
            patchLines.push((' ' + (content)))
          }
          break
        case '-':
          if (selected) {
            oldCount++
            patchLines.push(('' + (origin) + (content)))
          } else if (stage) {
            oldCount++
            newCount++
            patchLines.push((' ' + (content)))
          }

          break
      }
    }

    if (oldCount > 0 && oldStart === 0) oldStart = 1
    if (newCount > 0 && newStart === 0) newStart = 1
    const newHeader = ('@@ -' + (oldStart) + ',' + (oldCount) + ' +' + (newStart) + ',' + (newCount) + ' @@' + (context) + '\\n')
    const patchText = ('' + (newHeader) + (patchLines.join('\\n')) + '\\n')

    return {
      patchText: patchText,
      offset: newCount - oldCount
    }
  }

  stagePatches (fileDiff, patches) {
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
        return !fileDiff.isUntracked() ? this._indexBlob(oldPath) : null
      })
      .then(content => {
        let newContent = content || ''

        for (let patchText in patches) {
          newContent = JsDiff.applyPatch(newContent, patchText)
        }

        const buffer = new Buffer(newContent)
        const oid = data.repo.createBlobFromBuffer(buffer)

        let entry = null
        if (fileDiff.isDeleted()) {
          entry = data.index.getByPath(oldPath)
          entry.id = oid
          entry.fileSize = buffer.length
        } else {
          entry = this._createIndexEntry({
            oid: oid,
            path: newPath,
            fileSize: buffer.length,
            mode: fileDiff.getMode()
          })
        }

        if (oldPath !== newPath) data.index.removeByPath(oldPath)

        data.index.add(entry)
        return data.index.write()
      })
      .catch(error => {
        console.log(error.message)
        return console.log(error.stack)
      })
  }

  unstagePatches (fileDiff, patches) {
    const data = {}
    const newPath = fileDiff.getNewPathName()

    return Git.Repository
      .open(this.repoPath).then(repo => {
        data.repo = repo
        return repo.openIndex()
      })
      .then(index => {
        data.index = index
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

        for (let patchText in patches) {
          patchText = this._reversePatch(patchText)
          newContent = JsDiff.applyPatch(newContent, patchText)
        }

        if (!newContent && fileDiff.isAdded()) {
          return this.unstagePath(newPath)
        } else {
          return new Buffer(newContent)
        }
      })
  }

  _createIndexEntry ({oid, path, fileSize, mode}) {
    const entry = new Git.IndexEntry()
    entry.id = oid
    entry.mode = mode
    entry.path = path
    entry.fileSize = fileSize
    entry.flags = 0
    entry.flagsExtended = 0
    return entry
  }

  _reversePatch (patch) {
    const lines = patch.split('\\n')
    const header = lines.shift()
    const headerParts = header.match(/^@@ \-([^\s]+) \+([^\s]+) @@(.*)$/)
    const newHeader = ('@@ -' + (headerParts[2]) + ' +' + (headerParts[1]) + ' @@' + (headerParts[3]))

    const newLines = lines.map(line => {
      const origin = line[0]
      const content = line.substr(1)

      switch (origin) {
        case '+':
          return '-' + (content)
        case '-':
          return '+' + (content)
        default:
          return line
      }
    })

    newLines.unshift(newHeader)
    return newLines.join('\\n')
  }

  _indexBlob (path) {
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

  _treeBlob (path, sha) {
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
