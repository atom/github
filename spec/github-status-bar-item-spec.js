'use babel'

import GitHubStatusBarComponent from '../lib/components/github-status-bar-component'
import GitHubAuth from '../lib/github-auth'
import GitHubModel from '../lib/github-model'

import {buildClickEvent} from './event-helpers'

describe('GitHubStatusBarComponent', () => {
  let statusBarComponent
  describe('PR link', () => {
    beforeEach(() => {
      const auth = new GitHubAuth()
      statusBarComponent = new GitHubStatusBarComponent({gitHubModel: new GitHubModel(auth), auth: auth})
    })

    xdescribe('when there is no active pane item', () => {
      describe('and there is a single project directory', () => {
        describe('with a github remote', () => {
          it('shows available PRs')
          it('shows new PR when appropriate')
        })
        describe('without a github remote')
      })

      describe('and there are multiple project directories')
    })

    xit('shows PR link when there is a PR for a branch in the cache')
    xit('links to new repo page when there is no github remote')

    it('expires the PR cache when the statusbar link is clicked', () => {
      // For some reason I can't spy on this function directly
      statusBarComponent.model.signedIn = true
      statusBarComponent.model.expirePRCache = jasmine.createSpy('expirePRCache')
      statusBarComponent.update().then(() => {
        const anchor = statusBarComponent.element.querySelector('.github-new-pr')
        anchor.dispatchEvent(buildClickEvent(anchor))
        expect(statusBarComponent.model.expirePRCache).toHaveBeenCalled()
      })
    })
  })
})
