Git = require 'nodegit'
ChildProcess = require 'child_process'
os = require 'os'
fse = require 'fs-extra'
Path = require 'path'
exec = ChildProcess.exec

normalizeOptions = (options, Ctor) ->
  instance = (if options instanceof Ctor then options else new Ctor())
  return null  unless options
  Object.keys(options).forEach (key) ->
    instance[key] = options[key]
    return

  instance

module.exports =
class GitChanges
  changes: {}
  statuses: {}

  constructor: ->
    @tmpDir = os.tmpDir()
    @repoPath = atom.project.getPaths()[0]

  getBranch: ->
    Git.Repository.open(@repoPath).then (repo) =>
      repo.getBranch('HEAD')

  getPatch: (path, state) ->
    @stagedPromise.then (diffs) ->
      for patch in diffs[state].patches()
        return patch if patch.newFile().path() == path

      gatherDiffs()
      @getPatch(path, state)

  gatherDiffs: ->
    @stagedPromise = Git.Repository.open(@repoPath).then (repo) =>
      repo.openIndex().then (index) =>
        new Promise (resolve, reject) =>
          setImmediate =>
            opts = {
              flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT
            }
            Git.Diff.indexToWorkdir(repo, index, opts).then (unstagedDiffs) ->
              repo.getHeadCommit().then (commit) ->
                commit.getTree().then (tree) ->
                  Git.Diff.treeToIndex(repo, tree, index, opts).then (stagedDiffs) ->
                    resolve
                      staged: stagedDiffs
                      unstaged: unstagedDiffs

  getStatuses: ->
    @gatherDiffs()
    Git.Repository.open(@repoPath).then (repo) =>
      repo.getStatus().then (statuses) =>
        for status in statuses
          @statuses[status.path()] = status

        statuses

  getLatestUnpushed: ->
    Git.Repository.open(@repoPath).then (repo) ->
      repo.getCurrentBranch().then (branch) ->
        branchName = branch.name().replace('refs/heads/','')
        walker = repo.createRevWalk()
        walker.pushHead()

        repo.getReferenceNames().then (names) ->
          compareBranch = if names.indexOf("refs/remotes/origin/#{branchName}") >= 0
            "origin/#{branchName}"
          else if branchName != "master"
            "master"
          else
            null

          promise = new Promise (resolve, reject) =>
            if compareBranch
              repo.getBranchCommit(compareBranch).then (compare) =>
                walker.hide(compare)
                resolve()
            else
              resolve()

          promise.then ->
            walker.next().then (oid) ->
              if oid
                repo.getCommit(oid)
              else
                null

  undoLastCommit: ->
    new Promise (resolve, reject) =>
      ChildProcess.exec "git reset --soft HEAD~1", {cwd: @repoPath}, ->
        setImmediate -> resolve()

  stagePath: (path) ->
    @stageAllPaths([path])

  stageAllPaths: (paths) ->
    Git.Repository.open(@repoPath).then (repo) =>
      repo.openIndex().then (index) =>
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
        ChildProcess.exec "git reset HEAD #{paths.join(' ')}", {cwd: @repoPath}, =>
          setImmediate -> resolve()
      else
        resolve()

  wordwrap: (str) ->
    return str unless str.length
    str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join("\n")

  commit: (message) ->
    Git.Repository.open(@repoPath).then (repo) =>
      repo.openIndex().then (index) =>
        index.writeTree().then (indexTree) =>
          repo.getHeadCommit().then (parent) =>
            author = Git.Signature.default(repo)
            return repo.createCommit("HEAD", author, author, @wordwrap(message), indexTree, [parent])

  stagePatch: (patch, action) =>
    reverse = if action == 'unstage' then '--reverse ' else ''

    new Promise (resolve, reject) =>
      date = new Date
      time = date.getTime()

      file = Path.join(@tmpDir, "atom-file-patch-#{time}.patch")
      
      fse.writeFile file, patch, (e) =>
        ChildProcess.exec "git apply --unidiff-zero --whitespace=nowarn --cached #{reverse}#{file}", {cwd: @repoPath}, =>
          setImmediate -> resolve()
