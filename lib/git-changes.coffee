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

      repo.getStatus()

  stagePath: (path) ->
    @stageAllPaths([path])

  stageAllPaths: (paths) ->
    @indexPromise.then (index) ->
      index.addByPath(path) for path in paths
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

  commit: (message) ->
    @repoPromise.then (repo) =>
      @indexPromise.then (index) =>
        index.writeTree().then (indexTree) =>
          repo.getHeadCommit().then (parent) =>
            author = Git.Signature.default(repo)
            return repo.createCommit("HEAD", author, author, message, indexTree, [parent])
