{Emitter}    = require 'atom'
Git          = require 'nodegit'
ChildProcess = require 'child_process'
os           = require 'os'
fse          = require 'fs-extra'
Path         = require 'path'
_            = require 'underscore-contrib'
exec         = ChildProcess.exec
JsDiff       = require 'diff'

module.exports =
class GitIndex
  statuses: {}

  constructor: ->
    @tmpDir   = os.tmpDir()
    @repoPath = atom.project.getPaths()[0]
    @emitter = new Emitter

  emit: (event) ->
    @emitter.emit(event)

  onDidUpdateRepository: (callback) ->
    @emitter.on('did-update-repository', callback)

  statusCodes: ->
    Git.Status.STATUS

  getBranchName: ->
    Git.Repository.open(@repoPath).then (repo) =>
      repo.getBranch('HEAD')
    .then (branch) =>
      @normalizeBranchName(branch.name())
    .catch ->
      Promise.resolve("master")

  normalizeBranchName: (name) ->
    name.replace('refs/heads/','')

  localBranches: ->
    data = {}
    branches = []
    @getBranchName()
    .then (branchName) =>
      data.branchName = branchName
      Git.Repository.open(@repoPath)
    .then (repo) =>
      repo.getReferenceNames()
    .then (refs) =>
      for ref in refs
        if matches = ref.match /^refs\/heads\/(.*)/
          branch =
            name: matches[1]
            current: matches[1] == data.branchName
          branches.push branch

      for ref in refs
        if matches = ref.match /^refs\/remotes\/origin\/(.*)/
          branch =
            name: matches[1]
            current: matches[1] == data.branchName
            remote: true

          local = _.find branches, (br) ->
            br.name == branch.name

          branches.push branch unless local or branch.name is "HEAD"

      branches.sort (a, b) ->
        aName = a.name.toLowerCase()
        bName = b.name.toLowerCase()
        if aName < bName
          -1
        else if aName > bName
          1
        else
          0
    .catch ->
      Promise.resolve(name: 'master', current: true)

  createBranch: ({name, from}) ->
    data = {}
    name = @normalizeBranchName(name)
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      repo.getBranchCommit(from)
    .then (branch) =>
      signature = data.repo.defaultSignature()
      message = "Created #{name} from #{from}"
      data.repo.createBranch(name, branch, 0, signature, message).then =>
        @checkoutBranch(name)
    .then =>
      @emitter.emit('did-update-repository')

  trackRemoteBranch: (name) ->
    @createBranch({name: name, from: "origin/#{name}"})
    .then =>
      Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.getBranch(name)
    .then (branch) ->
      Git.Branch.setUpstream(branch, "origin/#{name}")
    .then =>
      @emitter.emit('did-update-repository')

  checkoutBranch: (name) ->
    Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.checkoutBranch(name)
    .then =>
      @emitter.emit('did-update-repository')

  getPatch: (path, state) ->
    @diffsPromise.then (diffs) ->
      diffs[state]?.patches().then (patchList) ->
        _.find patchList, (patch) -> patch.newFile().path() == path

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
      Git.Diff.treeToIndex(data.repo, tree, data.index, diffOpts)
    .then (stagedDiffs) ->
      data.stagedDiffs = stagedDiffs
      stagedDiffs.findSimilar(findOpts)
    .then ->
      diffs =
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

  resetBeforeCommit: (commit) ->
    commit.getParents().then (parents) ->
      Git.Reset.reset(commit.repo,
        if parents.length then parents[0] else null,
        Git.Reset.TYPE.SOFT)
    .then ->
      commit.repo.openIndex()
    .then (index) ->
      index.write()
    .then =>
      @emitter.emit('did-update-repository')

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
    .then =>
      @emitter.emit('did-update-repository')

  unstagePath: (path) ->
    @unstageAllPaths([path])

  unstageAllPaths: (paths) ->
    data = {}
    Git.Repository.open(@repoPath)
    .then (repo) =>
      data.repo = repo
      if repo.isEmpty()
        repo.openIndex()
        .then (index) =>
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
    .then =>
      @emitter.emit('did-update-repository')

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
    .then =>
      @emitter.emit('did-update-repository')

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
    .then =>
      @emitter.emit('did-update-repository')

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
    .then =>
      @emitter.emit('did-update-repository')

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

  treeBlob: (path, sha) ->
    Git.Repository.open(@repoPath)
    .then (repo) =>
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

  getCommitBlobs: (commit, patch) ->
    oldPath = patch.oldFile().path()
    oldSha = commit.parents()[0]
    newPath = patch.newFile().path()
    newSha = commit.id()

    oldBlob = @treeBlob(oldPath, oldSha) unless patch.isAdded()
    newBlob = @treeBlob(newPath, newSha) unless patch.isDeleted()

    if oldBlob and newBlob
      Git.Promise.all([oldBlob, newBlob]).then (blobs) ->
        data =
          old: blobs[0]
          new: blobs[1]
    else if newBlob
      newBlob.then (blob) ->
        data =
          old: ''
          new: blob
    else if oldBlob
      oldBlob.then (blob) ->
        data =
          old: blob
          new: ''
    else
      data =
        old: ''
        new: ''

  getBlobs: ({patch, status, commit}) ->
    if commit
      @getCommitBlobs(commit, patch)
    else
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

  forceCheckoutPath: (path) ->
    opts =
      checkoutStrategy: Git.Checkout.STRATEGY.FORCE
      paths: path

    Git.Repository.open(@repoPath)
    .then (repo) ->
      Git.Checkout.head(repo, opts)
    .then =>
      @emitter.emit('did-update-repository')
