'use babel'
/** @jsx etch.dom */

import etch from 'etch'

import {CompositeDisposable} from 'atom'

import AtomIcon from '../../shared-components/atom-icon'
import SignInExplanation from './sign-in-explanation'
import TokenInput from '../../shared-components/token-input'

import GitHubSignInModel from './github-sign-in-model'

const elapse = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default class GitHubModalSignInComponent {
  constructor ({gitHubModel, onClose}) {
    this.subscriptions = new CompositeDisposable()

    this.state = 'Default'
    this.token = ''
    this.model = new GitHubSignInModel(gitHubModel)
    this.onClose = onClose
    etch.initialize(this)
    this.addSubscriptions()
  }

  render () {
    return (
      <div className='github-modal-sign-in-component'>
        <a className='close-modal icon icon-x' onclick={this.cancel.bind(this)}></a>

        <div className='header'>
          <AtomIcon />
          <span className='icon icon-plus'></span>
          <span className='icon icon-mark-github'></span>
        </div>

        {this.state === 'Default'
          ? <SignInExplanation authorizationUrl={this.authorizationURL()} onClickSignIn={this.handleClickSignIn.bind(this)} />
          : <TokenInput
            shaking={this.shake}
            checking={this.state === 'Checking'}
            success={this.state === 'Success'}
            failure={this.state === 'Failure'}
            token={this.token}
            onSubmitToken={this.handleSubmitToken.bind(this)}
            onTokenChange={this.handleTokenChange.bind(this)} />
        }
      </div>
    )
  }

  update () {
    return etch.update(this)
  }

  handleClickSignIn () {
    this.state = 'WaitingForToken'
    return etch.update(this)
  }

  handleTokenChange (token) {
    this.token = token
    etch.update(this)
  }

  handleSubmitToken (event) {
    event.stopPropagation()
    event.preventDefault()
    this.saveToken(this.token)
  }

  addSubscriptions () {
    // Close the window on ESC
    const workspaceElement = atom.views.getView(atom.workspace)
    const cancelDisposable = atom.commands.add(workspaceElement, 'core:cancel', () => {
      this.cancel()
      cancelDisposable.dispose()
    })
    this.subscriptions.add(
      cancelDisposable,
      this.model.onDidFailTokenCheck(() => this.tokenCheckFailed()),
      this.model.onDidSucceedTokenCheck(user => this.tokenCheckSucceeded(user))
    )
  }

  cancel (event) {
    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    // Allow the entity that displayed us to determine
    // exactly how to hide and destroy us.
    if (this.onClose) {
      this.onClose()
    } else {
      this.destroy()
    }
  }

  async shakeTokenInput () {
    this.shake = true
    etch.update(this)
    await elapse(1000)
    this.shake = false
    etch.update(this)
  }

  saveToken (token) {
    if (!token || token === '') {
      return this.shakeTokenInput()
    } else {
      this.state = 'Checking'
      etch.update(this)
      // This ultimately runs `onDidSetToken()` callbacks on the GitHubAuth instance,
      // which will update our UI appropriately.
      // See ::tokenCheckSucceeded and ::tokenCheckFailed.
      return this.model.checkToken(token)
    }
  }

  async tokenCheckFailed () {
    this.state = 'Failure'
    await etch.update(this)
    return this.shakeTokenInput()
  }

  async tokenCheckSucceeded () {
    this.state = 'Success'
    await etch.update(this)
    await elapse(1000)
    return this.dismiss()
  }

  authorizationURL () {
    return atom.config.get('github.authorizationURL')
  }

  async destroy () {
    this.subscriptions.dispose()
    this.model.destroy()
    await etch.destroy(this)
  }
}
