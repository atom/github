Git          = require 'nodegit'
ChildProcess = require 'child_process'
os           = require 'os'
fse          = require 'fs-extra'
Path         = require 'path'
_            = require 'underscore-contrib'
exec         = ChildProcess.exec
JsDiff       = require 'diff'

module.exports =
class GitChanges
  statuses: {}

  constructor: ->
    @tmpDir   = os.tmpDir()
    @repoPath = atom.project.getPaths()[0]

  statusCodes: ->
    Git.Status.STATUS

  getBranchName: ->
    Git.Repository.open(@repoPath).then (repo) =>
      repo.getBranch('HEAD').then (branch) =>
        @normalizeBranchName(branch.name())

  normalizeBranchName: (name) ->
    name.replace('refs/heads/','')

  getPatch: (path, state) ->
    @diffsPromise.then (diffs) ->
      _.find diffs[state].patches(), (patch) ->
        patch.newFile().path() == path

  gatherDiffs: ->
    data = {}
    diffOpts =
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT |
             Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS

    findOpts =
      flags: Git.Diff.FIND.RENAMES |
             Git.Diff.FIND.RENAMES_FROM_REWRITES |
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
      data.repo.getHeadCommit()
    .then (commit) ->
      commit.getTree()
    .then (tree) ->
      Git.Diff.treeToIndex(data.repo, tree, data.index, diffOpts)
    .then (stagedDiffs) ->
      data.stagedDiffs = stagedDiffs
      stagedDiffs.findSimilar(findOpts)
    .then ->
      diffs =
        staged: data.stagedDiffs
        unstaged: data.unstagedDiffs

  getStatuses: ->
    @gatherDiffs()
    Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.getStatusExt()
    .then (statuses) =>
      for status in statuses
        @statuses[status.path()] = status
      statuses

  getComparisonBranch: (names, branchName) ->
    origin = "refs/remotes/origin/#{branchName}"
    if names.indexOf(origin) >= 0
      origin
    else if branchName != "master"
      "master"
    else
      null

  getLatestUnpushed: ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      repo.getCurrentBranch()
    .then (branch) =>
      data.branch     = branch
      data.branchName = @normalizeBranchName(branch.name())
      data.walker     = data.repo.createRevWalk()
      data.walker.pushHead()
      data.repo.getReferenceNames()
    .then (names) =>
      data.compareBranch = @getComparisonBranch(names, data.branchName)
      new Promise (resolve, reject) =>
        if data.compareBranch
          data.repo.getBranchCommit(data.compareBranch)
          .then (compare) =>
            data.walker.hide(compare)
            resolve()
        else
          resolve()
    .then =>
      data.walker.next()
    .then (oid) =>
      if oid then data.repo.getCommit(oid) else null

  undoLastCommit: ->
    new Promise (resolve, reject) =>
      ChildProcess.exec "git reset --soft HEAD~1", {cwd: @repoPath}, ->
        setImmediate -> resolve()

  stagePath: (path) ->
    @stageAllPaths([path])

  stageAllPaths: (paths) ->
    Git.Repository.open(@repoPath)
    .then (repo) =>
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
    .then (repo) =>
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      data.index = index
      index.writeTree()
    .then (indexTree) =>
      data.indexTree = indexTree
      data.repo.getHeadCommit()
    .then (parent) =>
      author = Git.Signature.default(data.repo)
      return data.repo.createCommit("HEAD",
        author,
        author,
        @wordwrap(message),
        data.indexTree,
        [parent])

  stagePatch: (patchText, patch) =>
    data = {}
    oldPath = patch.oldFile().path()
    newPath = patch.newFile().path()
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      data.index = index
      @indexBlob(oldPath) unless patch.isUntracked()
    .then (content) =>
      newContent = JsDiff.applyPatch(content or '', patchText)
      buffer = new Buffer(newContent)
      oid    = data.repo.createBlobFromBuffer(buffer)

      if patch.isDeleted()
        entry = data.index.getByPath(oldPath)
        entry.id = oid
        entry.fileSize = buffer.length
      else
        entry = @createIndexEntry
          oid: oid
          path: newPath
          fileSize: buffer.length
          mode: patch.newFile().mode()

      data.index.removeByPath(oldPath) if oldPath != newPath
      data.index.add(entry)
      data.index.write()

  unstagePatch: (patchText, patch) =>
    patchText = @reversePatch(patchText)

    data = {}
    oldPath = patch.oldFile().path()
    newPath = patch.newFile().path()
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      data.index = index
      entry = index.getByPath(newPath, 0)
      if entry?
        data.repo.getBlob(entry.id).then (blob) ->
          blob?.toString()
    .then (content) =>
      newContent = JsDiff.applyPatch(content or '', patchText)
      if !newContent and patch.isAdded()
        @unstagePath(newPath)
      else
        buffer = new Buffer(newContent)
        oid    = data.repo.createBlobFromBuffer(buffer)
        entry = @createIndexEntry
          oid: oid
          path: newPath
          fileSize: buffer.length
          mode: patch.newFile().mode()
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

  workingBlob: (path) ->
    new Git.Promise (resolve, reject) =>
      fse.readFile "#{@repoPath}/#{path}", "utf8", (e, text) ->
        resolve(text)

  indexBlob: (path) ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      repo.openIndex()
    .then (index) =>
      entry = index.getByPath(path, 0)
      if entry?
        data.repo.getBlob(entry.id).then (blob) ->
          blob?.toString()
      else
        @treeBlob(path)

  treeBlob: (path) ->
    Git.Repository.open(@repoPath)
    .then (repo) =>
      repo.getHeadCommit()
    .then (commit) ->
      commit.getTree()
    .then (tree) ->
      tree.getEntry(path)
    .then (entry) ->
      entry.getBlob()
    .then (blob) ->
      blob?.toString()

  getBlobs: ({patch, status, commit}) ->
    if patch
      if status == 'staged'
        @getStagedBlobs(patch)
      else
        @getUnstagedBlobs(patch)

  getStagedBlobs: (patch) ->
    oldPath = patch.oldFile().path()
    newPath = patch.newFile().path()

    if patch.isAdded() or patch.isUntracked()
      @indexBlob(newPath).then (newBlob) =>
        data =
          new: newBlob
          old: ''
    else if patch.isDeleted()
      @treeBlob(oldPath).then (oldBlob) =>
        data =
          old: oldBlob
          new: ''
    else
      Git.Promise.all([@treeBlob(oldPath), @indexBlob(newPath)])
      .then (blobs) ->
        data =
          old: blobs[0]
          new: blobs[1]

  getUnstagedBlobs: (patch) ->
    oldPath = patch.oldFile().path()
    newPath = patch.newFile().path()

    if patch.isAdded() or patch.isUntracked()
      @workingBlob(newPath).then (newBlob) =>
        data =
          new: newBlob
          old: ''
    else if patch.isDeleted()
      @indexBlob(oldPath).then (oldBlob) =>
        data =
          old: oldBlob
          new: ''
    else
      Git.Promise.all([@indexBlob(oldPath), @workingBlob(newPath)])
      .then (blobs) ->
        data =
          old: blobs[0]
          new: blobs[1]
