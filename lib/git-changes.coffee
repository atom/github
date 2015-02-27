Git          = require 'nodegit'
ChildProcess = require 'child_process'
os           = require 'os'
fse          = require 'fs-extra'
Path         = require 'path'
_            = require 'underscore-contrib'
exec         = ChildProcess.exec

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
    opts =
      flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT

    @diffsPromise = Git.Repository.open(@repoPath).then (repo) ->
      data.repo = repo
      data.repo.openIndex()
    .then (index) ->
      data.index = index
      Git.Diff.indexToWorkdir(data.repo, data.index, opts)
    .then (unstagedDiffs) ->
      data.unstagedDiffs = unstagedDiffs
      data.repo.getHeadCommit()
    .then (commit) ->
      commit.getTree()
    .then (tree) ->
      Git.Diff.treeToIndex(data.repo, tree, data.index, opts)
    .then (stagedDiffs) ->
      diffs =
        staged:   stagedDiffs
        unstaged: data.unstagedDiffs

  getStatuses: ->
    @gatherDiffs()
    Git.Repository.open(@repoPath)
    .then (repo) ->
      repo.getStatus()
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
        if status.statusBit() & Git.Status.STATUS.WT_DELETED
          index.removeByPath(path)
        else
          index.addByPath(path)

      index.write()

  unstagePath: (path) ->
    @unstageAllPaths([path])

  unstageAllPaths: (paths) ->
    new Promise (resolve, reject) =>
      if paths.length
        command = "git reset HEAD #{paths.join(' ')}"
        ChildProcess.execSync command, {cwd: @repoPath}

      resolve()

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

  stagePatch: (patch, action) =>
    time = new Date().getTime()
    file = Path.join(@tmpDir, "atom-file-patch-#{time}.patch")
    path = @repoPath

    command = "git apply --unidiff-zero --whitespace=nowarn --cached "
    command += "--reverse " if action == 'unstage'
    command += file

    new Promise (resolve, reject) ->
      fse.writeFile file, patch, (e) ->
        ChildProcess.exec command, {cwd: path}, (e) ->
          setImmediate -> resolve()

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
      data.repo.getBlob(entry.id())
    .then (blob) ->
      blob.toString()

  getBlobs: (patch) ->
    oldPath = patch.oldFile().path()
    newPath = patch.newFile().path()

    if patch.isAdded()
      @workingBlob(newPath).then (newBlob) =>
        data =
          new: newBlob
     else if patch.isDeleted()
      @indexBlob(oldFile).then (oldBlob) =>
        data =
          old: oldBlob
    else
      Git.Promise.all([@indexBlob(oldPath), @workingBlob(newPath)])
      .then (blobs) ->
        data =
          old: blobs[0]
          new: blobs[1]
