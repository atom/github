'use babel'

import fs from 'fs'
import path from 'path'

import GitHubStatusBarModel from '../../lib/github/status-bar/github-status-bar-model'
import GitHubModel from '../../lib/github/github-model'
import GitHubAuth from '../../lib/github/auth/github-auth'

describe('GitHubStatusBarModel', () => {
  let model

  beforeEach(() => {
    model = new GitHubStatusBarModel()
    model.initialize(new GitHubModel(new GitHubAuth()))
  })

  describe('::cachedPullRequestForBranch', () => {
    // Doing the right thing is not currently supported but we don't do the WRONG thing...
    // which is linking to a PR when you have master checked out locally.
    it('does not do the wrong thing with master & forks', () => {
      model.gitHubModel.currentBranch = 'master'
      model.gitHubModel.gitHubRemote = 'git@github.com:atom/atom.git'
      model.gitHubModel.pullRequests[model.gitHubModel.gitHubRemote] = [JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/pull.json')).toString())]
      spyOn(GitHubModel.prototype, 'githubNWO').andReturn(async function () { return 'atom/atom' })
      expect(model.gitHubModel.cachedPullRequestForBranch('master')).toBeFalsy()
    })
  })
})
