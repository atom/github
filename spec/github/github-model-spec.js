'use babel'

import GitHubAuth from '../../lib/github/auth/github-auth'
import GitHubModel from '../../lib/github/github-model'

describe('GitHubModel', () => {
  let model

  describe('fetching pull requests', () => {
    xdescribe('on pr fetch failure', () => {
      beforeEach(() => {
        model = new GitHubModel(new GitHubAuth())
        // all these spies are a sign that the implementation could be cleaned up
        spyOn(model, 'getLocalRepoMetadata').andCallFake(async function () {
          return {currentBranch: 'foo', gitHubRemote: 'foo/bar'}
        })
        spyOn(model, 'fetchPullRequests').andCallFake(async function () { throw new Error('HTTP 404') })
        spyOn(model, 'isCurrentTokenValid').andCallFake(async function () { return true })
        spyOn(model, 'isTokenValid').andCallFake(async function () { return false })
        spyOn(model, 'getBuildStatus').andCallFake(async function () { return null })
      })

      it('rechecks token validity and triggers didFailFetchingWithValidToken', () => {
        const failureSpy = jasmine.createSpy('failureSpy')
        model.onDidFailFetchingWithValidToken(failureSpy)

        model.getRepoMeta()
        waitsFor('failureSpy to have been called', () => {
          return failureSpy.callCount > 0
        })
        runs(() => {
          expect(failureSpy).toHaveBeenCalled()
        })
      })

      it('does not call didFailFetchingWithValidToken within timeout', () => {
        const failureSpy = jasmine.createSpy('failureSpy')
        model.onDidFailFetchingWithValidToken(failureSpy)
        const metaSpy = jasmine.createSpy('metaSpy')
        model.onDidChangeRepoMeta(metaSpy)

        model.getRepoMeta()
        waitsFor('failureSpy to have been called', () => failureSpy.callCount > 0)
        runs(() => {
          expect(failureSpy.callCount).toBe(1)
          metaSpy.reset()
          // bad smell duplicating impl in test here, maybe c/should remove side effects from isTokenValid
          model.validityCheckTimesByRepo[model.gitHubRemote] = Date.now()
          model.getRepoMeta()
        })
        waitsFor('metaSpy to have been called', () => metaSpy.callCount > 0)
        runs(() => expect(failureSpy.callCount).toBe(1))
      })
    })
  })
})
