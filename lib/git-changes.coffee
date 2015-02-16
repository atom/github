Git = require 'nodegit'
ChildProcess = require 'child_process'

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
    @repoPath = atom.project.getPaths()[0]
    @repoPromise = Git.Repository.open(@repoPath)
    @indexPromise = @repoPromise.then (repo) ->
      repo.openIndex()

  getBranch: ->
    @repoPromise.then (repo) ->
      repo.getBranch('HEAD')

  getPatch: (path, state) ->
    if state == 'unstaged'
      @unstagedPromise.then (diff) ->
        for patch in diff.patches()
          return patch if patch.newFile().path() == path
    else
      @stagedPromise.then (diff) ->
        for patch in diff.patches()
          return patch if patch.newFile().path() == path

  getStatuses: ->
    @repoPromise.then (repo) =>

      opts = {
        flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT
      }

      @unstagedPromise = @indexPromise.then (index) ->
        Git.Diff.indexToWorkdir(repo, index, opts)

      @stagedPromise = @indexPromise.then (index) ->
        repo.getHeadCommit().then (commit) ->
          commit.getTree().then (tree) ->
            Git.Diff.treeToIndex(repo, tree, index, opts)

      @stagedPromise.catch (e) -> console.log e
      @unstagedPromise.catch (e) -> console.log e

      repo.getStatus().then (statuses) =>
        for status in statuses
          @statuses[status.path()] = status

        statuses

  getLatestUnpushed: ->
    @repoPromise.then (repo) ->
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
    ChildProcess.execSync "git reset --soft HEAD~1",
      cwd: @repoPath

  stagePath: (path) ->
    @stageAllPaths([path])

  stageAllPaths: (paths) ->
    @indexPromise.then (index) =>
      for path in paths
        status = @statuses[path]
        if status.statusBit() & Git.Status.STATUS.WT_DELETED
          index.removeByPath(path)
        else
          index.addByPath(path)

      index.write()
      new Promise (resolve, reject) =>
        process.nextTick =>
          resolve()

  unstagePath: (path) ->
    @unstageAllPaths([path])

  unstageAllPaths: (paths) ->
    new Promise (resolve, reject) =>
      if paths.length
        ChildProcess.execSync "git reset HEAD #{paths.join(' ')}",
          cwd: @repoPath

      process.nextTick => resolve()

  wordwrap: (str) ->
    return str unless str.length
    str.match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join("\n")

  commit: (message) ->
    @repoPromise.then (repo) =>
      @indexPromise.then (index) =>
        index.writeTree().then (indexTree) =>
          repo.getHeadCommit().then (parent) =>
            author = Git.Signature.default(repo)
            return repo.createCommit("HEAD", author, author, @wordwrap(message), indexTree, [parent])
