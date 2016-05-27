'use babel'

import keytar from 'keytar'
import CachedRequest from '../../lib/cached-request.js'
import GitHubStatusBarComponent from '../../lib/github/status-bar/github-status-bar-component.js'

describe('the `github` package', () => {
  let workspaceElement

  beforeEach(async () => {
    workspaceElement = atom.views.getView(atom.workspace)
    await atom.packages.activatePackage('status-bar')
    await atom.packages.activatePackage('github')
  })

  describe('github:sign-out', () => {
    beforeEach(() => {
      spyOn(keytar, 'deletePassword').andReturn(true)
    })

    it('deletes the token', () => {
      const commandReturn = atom.commands.dispatch(workspaceElement, 'github:sign-out')
      expect(commandReturn).toBeTruthy()
      expect(keytar.deletePassword).toHaveBeenCalled()
    })

    it('clears the cache', () => {
      // TODO use atom.config to set the base URI for test
      spyOn(CachedRequest.prototype, 'clear')
      const commandReturn = atom.commands.dispatch(workspaceElement, 'github:sign-out')
      expect(commandReturn).toBeTruthy()
      waitsFor('CachedRequest::clear to have been called', () => CachedRequest.prototype.clear.callCount > 0)
      runs(() => expect(CachedRequest.prototype.clear).toHaveBeenCalled())
    })

    it('updates the status bar', () => {
      spyOn(GitHubStatusBarComponent.prototype, 'update')
      const commandReturn = atom.commands.dispatch(workspaceElement, 'github:sign-out')
      expect(commandReturn).toBeTruthy()
      waitsFor('GitHubStatusBarComponent::update to have been called', () => GitHubStatusBarComponent.prototype.update.callCount > 0)
      runs(() => expect(GitHubStatusBarComponent.prototype.update).toHaveBeenCalled())
    })
  })
})
