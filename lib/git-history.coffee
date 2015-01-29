Git = require 'nodegit'
Git.Threads.init()

module.exports =
class GitHistory
  commits: {}
  numberCommits: 50

  constructor: ->
    @repoPromise = Git.Repository.open(atom.project.getPaths()[0])

  addCommit: (commit) -> @commits[commit.sha()] = commit

  getCommit: (sha) -> @commits[sha]

  getBranch: ->
    return @repoPromise.then (repo) ->
      return repo.getBranch('HEAD')

  getDiff: (sha) ->
    commit = @getCommit(sha)
    commit.getDiff()

  walkHistory: (commitCallback) ->
    walk = (repo, walker, numberCommits, callback) ->
      return if numberCommits == 0
      walker.next().then (oid) =>
        repo.getCommit(oid).then(callback)
        walk(repo, walker, numberCommits - 1, callback)

    @repoPromise.then (repo) =>
      walker = repo.createRevWalk()
      walker.simplifyFirstParent()
      walker.pushHead()

      Promise.all([repo.getHeadCommit(), repo.getBranchCommit('master')]).then (commits) =>
        Git.Merge.base(repo, commits[0], commits[1]).then (base) =>
          walker.hide(base) unless commits[0].id().toString() == base.toString()
          walk repo, walker, @numberCommits, (commit) =>
            @addCommit(commit)
            commitCallback(commit)

  @authorAvatar: (email) ->
    if matches = email.match /([^@]+)@users\.noreply\.github\.com/i
      "https://avatars.githubusercontent.com/#{matches[1]}?s=80"
    else
      "https://avatars.githubusercontent.com/u/e?email=#{email}&s=80"
