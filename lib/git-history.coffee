Git = require 'nodegit'

module.exports =
class GitHistory
  commits: {}
  numberCommits: 10

  constructor: ->
    @repoPromise = Git.Repository.open(atom.project.getPaths()[0])

  addCommit: (commit) -> @commits[commit.sha()] = commit

  getCommit: (sha) -> @commits[sha]

  walkHistory: (commitCallback) ->
    walk = (repo, walker, numberCommits, callback) ->
      return if numberCommits == 0
      walker.next().then (oid) =>
        repo.getCommit(oid).then(callback)
        walk(repo, walker, numberCommits - 1, callback)

    @repoPromise.then (repo) =>
      repo.getHeadCommit().then (commit) =>
        walker = repo.createRevWalk()
        walker.push(commit.id())
        walk repo, walker, @numberCommits, (commit) =>
          @addCommit(commit)
          commitCallback(commit)
