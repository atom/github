Git = require 'nodegit'

module.exports =
class GitHistory
  @commits: {}
  numberCommits: 100

  constructor: ->
    @repoPath = atom.project.getPaths()[0]
    @setRepoPromise()

  setRepoPromise: ->
    @repoPromise = Git.Repository.open(@repoPath)

  addCommit: (sha) ->
    @repoPromise.then (repo) =>
      repo.getCommit(sha)
    .then (commit) =>
      @constructor.commits[commit.sha()] = commit
      commit

  getCommit: (sha) ->
    new Promise (resolve, reject) =>
      commit = @constructor.commits[sha] || @addCommit(sha)
      resolve(commit)

  getBranch: ->
    @repoPromise.then (repo) ->
      repo.getBranch('HEAD')
    .then (branch) ->
      branch.name().replace('refs/heads/','')

  getDiff: (sha) ->
    data = {}
    findOpts =
      flags: Git.Diff.FIND.RENAMES |
             Git.Diff.FIND.RENAMES_FROM_REWRITES |
             Git.Diff.FIND.FOR_UNTRACKED

    @getCommit(sha).then (commit) ->
      commit.getDiff()
    .then (diffs) ->
      data.diffs = diffs
      promises = []
      for diff in diffs
        promises.push diff.findSimilar(findOpts).then -> diff
      Git.Promise.all(promises)

  walkHistory: (fromSha) ->
    data = {}
    @repoPromise
    .then (repo) =>
      data.repo = repo
      data.walker = repo.createRevWalk()
      data.walker.simplifyFirstParent()
      if fromSha
        data.walker.push(Git.Oid.fromString(fromSha))
      else
        data.walker.pushHead()
      Promise.all([repo.getHeadCommit(), repo.getBranchCommit('master')])
    .then (commits) =>
      data.head = commits[0]
      data.headId = data.head.sha()
      data.master = commits[1]
      data.masterId = data.master.sha()
      Git.Merge.base(data.repo, data.head, data.master)
    .then (base) =>
      @currentBase = base
      data.walker.hide(base) unless data.headId == data.masterId
      walk = (commits = [])=>
        return commits if commits.length >= @numberCommits
        data.walker.next().then (oid) =>
          if oid
            commits.push(oid)
            walk(commits)
          else
            commits
      commits = walk()
      commits

  @authorAvatar: (email) ->
    if matches = email.match /([^@]+)@users\.noreply\.github\.com/i
      "https://avatars.githubusercontent.com/#{matches[1]}?s=80"
    else
      "https://avatars.githubusercontent.com/u/e?email=#{email}&s=80"
