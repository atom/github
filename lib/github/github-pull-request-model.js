'use babel'

export default class GitHubPullRequestModel {
  constructor (gitHubModel) {
    this.gitHubModel = gitHubModel
    this.resetState()
  }

  resetState () {
    this.currentPullRequest = null
    this.pullRequests = {}
  }

  getPullRequestForCurrentBranch () {
    if (this.gitHubModel.currentBranch) {
      this.currentPullRequest = this.cachedPullRequestForBranch(this.gitHubModel.currentBranch)
    } else {
      this.currentPullRequest = null
    }
    return this.currentPullRequest
  }

  // Right now this just does some simple matching that mostly just works
  // reliably for PRs that are branches on origin, not forks. It needs to be
  // made much more sophisticated, fortunately we get all kinds of great info
  // from the GitHub API about PRs that we can use to compare.
  cachedPullRequestForBranch (branchName) {
    const filter = (item) => {
      if (item && item.head && item.head.repo && this.gitHubModel.gitHubRemote) {
        if (item.head.repo.full_name.toLowerCase() === this.gitHubModel.gitHubRemote.toLowerCase()) {
          return item.head.ref === this.gitHubModel.currentBranch
        }
      } else {
        return null
      }
    }
    return (this.pullRequests[this.gitHubModel.gitHubRemote] || []).find(filter)
  }

  // This function would benefit from GraphQL.
  async fetchPullRequests () {
    await this.gitHubModel.getLocalRepoMetadata()
    let pulls = []
    let parentPulls = []

    try {
      // fetch pull requests for this repo
      pulls = await this.gitHubModel.gitHubAPI.paginatedRequest(`/repos/${this.gitHubModel.gitHubRemote}/pulls`)
    } catch (error) {
      console.error('Error fetching pull requests from GitHub', error)
    }

    // Is this repo a fork? If so, make some more HTTP requests. Throw if we 404
    // so we can do a token check up the chain as necessary
    const repoResponse = await this.gitHubModel.gitHubAPI.request(`/repos/${this.gitHubModel.gitHubRemote}`, {}, {shouldThrow: true})

    try {
      const repo = repoResponse ? repoResponse.data : {}
      if (repo.parent) {
        parentPulls = await this.gitHubModel.gitHubAPI.paginatedRequest(`/repos/${repo.parent.full_name}/pulls`)
      }
      this.pullRequests[this.gitHubModel.gitHubRemote] = pulls.concat(parentPulls)

      this.getPullRequestForCurrentBranch()
    } catch (error) {
      console.error('Error fetching fork parent pull requests from GitHub', error)
    }
  }

  /*
    Pull Request Review Comments
    ============================
  */

  async getBufferComments () {
    try {
      await this.fetchPullRequests()
      if (!this.currentPullRequest || !this.gitHubModel.gitHubRemote) { // helperize
        return []
      }
      // we shouldn't be building these paths ourselves
      return await this.gitHubModel.gitHubAPI.paginatedRequest(
        `/repos/${this.currentPullRequest.base.repo.full_name}/pulls/${this.currentPullRequest.number}/comments`
      )
    } catch (e) {
      this.gitHubModel.authModel.catchAndRecheckToken(e, this.gitHubModel.gitHubRemote)
      return []
    }
  }

}
