'use babel'

import GitHubModalSignInComponent from '../lib/components/github-modal-sign-in-component'
import GitHubModel from '../lib/github-model.js'
import GitHubAuth from '../lib/github-auth.js'

describe('GitHubModalSignInComponent', () => {
  let gitHubModel, component, element
  beforeEach(() => {
    gitHubModel = new GitHubModel(new GitHubAuth())
    component = new GitHubModalSignInComponent({gitHubModel: gitHubModel})
    element = component.element
  })

  xdescribe('dismissing the modal', () => {
    it('closes when x is clicked', () => {

    })

    it('closes with core:cancel', () => {

    })
  })

  describe('signing in', () => {
    describe('after an unsuccessful attempt', () => {
      it('hides the error state and shows the success state', () => {
        spyOn(component, 'cancel')
        component.tokenCheckFailed().then(() => component.tokenCheckSucceeded()).then(() => {
          expect(element.querySelector('.token-input.is-error')).toBeFalsy()
          expect(element.querySelector('.response.is-success')).toBeTruthy()
        })
      })
    })
  })

  describe('token validation', () => {
    beforeEach(() => {
      component.state = 'WaitingForToken'
    })

    it('displays a message when the token is invalid', () => {
      component.tokenCheckFailed().then(() => {
        const messageElement = element
          .querySelector('.sign-in-form-group')
          .querySelector('.response')

        expect(messageElement.classList.contains('hidden')).toBe(false)
        expect(messageElement.textContent).toMatch(/Unable to sign you in/)
      })
    })

    it('displays a message and closes the modal when the token is valid', () => {
      component.tokenCheckSucceeded().then(() => {
        const messageElement = element
          .querySelector('.sign-in-form-group')
          .querySelector('.response')

        expect(messageElement.classList.contains('hidden')).toBe(false)
        expect(messageElement.textContent).toMatch(/Success/)
      })
    })
  })
})
