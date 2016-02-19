{Emitter, GitRepositoryAsync} = require 'atom'
ChildProcess                  = require 'child_process'
os                            = require 'os'
fse                           = require 'fs-extra'
Path                          = require 'path'
_                             = require 'underscore-contrib'
exec                          = ChildProcess.exec
JsDiff                        = require 'diff'

Git = GitRepositoryAsync.Git

module.exports =
class GitService
  statuses: {}

  # Sorry about the singleton, but there is no need to pass this thing around all over the place
  @instance: ->
    unless @_instance?
      @_instance = new GitService
    @_instance

  constructor: ->
    @repoPath = atom.project.getPaths()[0]

  getDiffForPath: (path, state) ->
    @diffsPromise.then (diffs) ->
      diffs[state]?.patches().then (patchList) ->
        _.find patchList, (patch) -> patch.newFile().path() == path

  getDiffs: (state) ->
    @diffsPromise.then (diffs) ->
      diffs[state]?.patches().then (patchList) ->
        patchList

  gatherDiffs: ->
    data = {}
    diffOpts =
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT |
             Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS

    findOpts =
      flags: Git.Diff.FIND.RENAMES |
             Git.Diff.FIND.FOR_UNTRACKED

    @diffsPromise = Git.Repository.open(@repoPath).then (repo) ->
      data.repo = repo
      data.repo.openIndex()
    .then (index) ->
      data.index = index
      Git.Diff.indexToWorkdir(data.repo, data.index, diffOpts)
    .then (unstagedDiffs) ->
      data.unstagedDiffs = unstagedDiffs
      unstagedDiffs.findSimilar(findOpts)
    .then ->
      data.repo.getHeadCommit() unless data.repo.isEmpty()
    .then (commit) ->
      commit.getTree() unless data.repo.isEmpty()
    .then (tree) ->
      data.tree = tree
      Git.Diff.treeToIndex(data.repo, tree, data.index, diffOpts)
    .then (stagedDiffs) ->
      data.stagedDiffs = stagedDiffs
      stagedDiffs.findSimilar(findOpts)
    .then ->
      # Git.Diff.treeToWorkdir(data.repo, data.tree, diffOpts)
      Git.Diff.treeToWorkdirWithIndex(data.repo, data.tree, diffOpts)
    .then (allDiffs) ->
      data.allDiffs = allDiffs
      allDiffs.findSimilar(findOpts)
    .then ->
      diffs =
        all: data.allDiffs
        staged: data.stagedDiffs
        unstaged: data.unstagedDiffs

  getStatuses: ->
    opts =
      flags: Git.Status.OPT.INCLUDE_UNTRACKED |
             Git.Status.OPT.RECURSE_UNTRACKED_DIRS |
             Git.Status.OPT.RENAMES_INDEX_TO_WORKDIR |
             Git.Status.OPT.RENAMES_HEAD_TO_INDEX

    @gatherDiffs()
    Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.getStatusExt(opts)
    .then (statuses) =>
      for status in statuses
        @statuses[status.path()] = status
      statuses

  stagePath: (path) ->
    @stageAllPaths([path])

  stageAllPaths: (paths) ->
    Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.openIndex()
    .then (index) =>
      for path in paths
        status = @statuses[path]
        if status.isDeleted()
          index.removeByPath(path)
        else if status.isRenamed()
          index.removeByPath(status.indexToWorkdir().oldFile().path())
          index.addByPath(path)
        else
          index.addByPath(path)

      index.write()

  unstagePath: (path) ->
    @unstageAllPaths([path])

  unstageAllPaths: (paths) ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      if repo.isEmpty()
        repo.openIndex()
        .then (index) ->
          index.removeByPath(path) for path in paths
          index.write()
      else
        repo.getHeadCommit()
        .then (commit) =>
          for path in paths
            status = @statuses[path]
            if status.isRenamed()
              Git.Reset.default(data.repo, commit,
                status.headToIndex().oldFile().path())

            Git.Reset.default(data.repo, commit, path)

  wordwrap: (str) ->
    return str unless str.length
    str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join("\n")

  commit: (message) ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) ->
      data.repo = repo
      repo.openIndex()
    .then (index) ->
      data.index = index
      index.writeTree()
    .then (indexTree) ->
      data.indexTree = indexTree
      data.repo.getHeadCommit()
    .catch -> data.parent = null
    .then (parent) =>
      parents = if parent? then [parent] else null
      author = Git.Signature.default(data.repo)
      data.repo.createCommit("HEAD",
        author,
        author,
        @wordwrap(message),
        data.indexTree,
        parents)

  parseHeader: (header) ->
    headerParts =
      header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)
    return false unless headerParts

    data =
      oldStart: parseInt(headerParts[1], 10)
      oldCount: parseInt(headerParts[2], 10)
      newStart: parseInt(headerParts[3], 10)
      newCount: parseInt(headerParts[4], 10)
      context:  headerParts[5]

  calculatePatchTexts: (selectedLinesByHunk, stage) ->
    offset = 0
    patches = []
    for hunkString of selectedLinesByHunk
      {linesToStage, linesToUnstage} = selectedLinesByHunk[hunkString]

      linesToUse = if linesToStage.length > 0 then linesToStage else linesToUnstage

      hunk = linesToUse[0].hunk
      result = @calculatePatchText(hunk, linesToUse, offset, stage)
      offset += result.offset
      patches.push(result.patchText)
    Promise.resolve(patches)

  calculatePatchText: (hunk, selectedLines, offset, stage) ->
    header = hunk.getHeader()

    {oldStart, context} = @parseHeader(header)
    oldStart += offset
    newStart = oldStart
    oldCount = newCount = 0

    hunkLines = hunk.getLines()
    patchLines = []
    for line, idx in hunkLines
      selected = selectedLines.some (selectedLine) ->
        if line.isAddition()
          line.getNewLineNumber() == selectedLine.getNewLineNumber()
        else if line.isDeletion()
          line.getOldLineNumber() == selectedLine.getOldLineNumber()
        else
          false

      content = line.getContent()
      origin = line.getLineOrigin()
      switch origin
        when ' '
          oldCount++
          newCount++
          patchLines.push "#{origin}#{content}"
        when '+'
          if selected
            newCount++
            patchLines.push "#{origin}#{content}"
          else if not stage
            oldCount++
            newCount++
            patchLines.push " #{content}"
        when '-'
          if selected
            oldCount++
            patchLines.push "#{origin}#{content}"
          else if stage
            oldCount++
            newCount++
            patchLines.push " #{content}"

    oldStart = 1 if oldCount > 0 and oldStart == 0
    newStart = 1 if newCount > 0 and newStart == 0

    header = "@@ -#{oldStart},#{oldCount} +#{newStart},#{newCount} @@#{context}\n"
    patchText = "#{header}#{patchLines.join("\n")}\n"
    {patchText, offset: newCount - oldCount}

  stagePatches: (fileDiff, patches) =>
    data = {}
    oldPath = fileDiff.getOldPathName()
    newPath = fileDiff.getNewPathName()
    Git.Repository.open(@repoPath)
    .then (repo) ->
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      data.index = index
      @indexBlob(oldPath) unless fileDiff.isUntracked()
    .then (content) =>
      newContent = if content then content else ''
      for patchText in patches
        newContent = JsDiff.applyPatch(newContent, patchText)
      buffer = new Buffer(newContent)
      oid    = data.repo.createBlobFromBuffer(buffer)

      if fileDiff.isDeleted()
        entry = data.index.getByPath(oldPath)
        entry.id = oid
        entry.fileSize = buffer.length
      else
        entry = @createIndexEntry
          oid: oid
          path: newPath
          fileSize: buffer.length
          mode: fileDiff.getMode()

      data.index.removeByPath(oldPath) if oldPath != newPath
      data.index.add(entry)
      data.index.write()
    .catch (error) ->
      console.log error.message
      console.log error.stack

  unstagePatches: (fileDiff, patches) =>
    data = {}
    oldPath = fileDiff.getOldPathName()
    newPath = fileDiff.getNewPathName()
    Git.Repository.open(@repoPath)
    .then (repo) ->
      data.repo = repo
      repo.openIndex()
    .then (index) ->
      data.index = index
      entry = index.getByPath(newPath, 0)
      if entry?
        data.repo.getBlob(entry.id).then (blob) ->
          blob?.toString()
    .then (content) =>
      newContent = if content then content else ''
      for patchText in patches
        patchText = @reversePatch(patchText)
        newContent = JsDiff.applyPatch(newContent, patchText)

      if !newContent and fileDiff.isAdded()
        @unstagePath(newPath)
      else
        buffer = new Buffer(newContent)
        oid    = data.repo.createBlobFromBuffer(buffer)
        entry = @createIndexEntry
          oid: oid
          path: newPath
          fileSize: buffer.length
          mode: fileDiff.getMode()
        data.index.add(entry)
        data.index.write()

  createIndexEntry: ({oid, path, fileSize, mode}) ->
    entry  = new Git.IndexEntry()
    entry.id = oid
    entry.mode = mode
    entry.path = path
    entry.fileSize = fileSize
    entry.flags = 0
    entry.flagsExtended = 0

    entry

  reversePatch: (patch) ->
    lines = patch.split("\n")
    header = lines.shift()
    headerParts = header.match(/^@@ \-([^\s]+) \+([^\s]+) @@(.*)$/)
    newHeader = "@@ -#{headerParts[2]} +#{headerParts[1]} @@#{headerParts[3]}"

    newLines = lines.map (line) ->
      origin = line[0]
      content = line.substr(1)
      switch origin
        when '+'
          "-#{content}"
        when '-'
          "+#{content}"
        else
          line

    newLines.unshift(newHeader)
    newLines.join("\n")

  indexBlob: (path) ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) ->
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      entry = index.getByPath(path, 0)
      if entry?
        data.repo.getBlob(entry.id).then (blob) ->
          blob?.toString()
      else
        @treeBlob(path)

  treeBlob: (path, sha) ->
    Git.Repository.open(@repoPath)
    .then (repo) ->
      if sha
        repo.getCommit(sha)
      else
        repo.getHeadCommit()
    .then (commit) ->
      commit.getTree()
    .then (tree) ->
      tree.getEntry(path)
    .then (entry) ->
      if entry?
        entry.getBlob().then (blob) ->
          if blob?
            blob.toString()
          else
            ""
      else
        ""
