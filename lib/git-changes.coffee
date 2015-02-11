Git = require 'nodegit'

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
    @repoPromise = Git.Repository.open(atom.project.getPaths()[0])
    @indexPromise = @repoPromise.then (repo) ->
      repo.openIndex()

  getBranch: ->
    @repoPromise.then (repo) ->
      repo.getBranch('HEAD')

  getPatch: (path, state) ->
    console.log('getting', path, state)
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
    @indexPromise.then (index) ->
      index.addByPath(path)
      index.write()

  unstagePath: (path) ->
    @indexPromise.then (index) ->
      index.removeByPath(path)
      index.write()
