/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'

import PushPullViewModel from './push-pull-view-model'

type PushPullComponentProps = {viewModel: PushPullViewModel}

const ErrorTimeout = 5 * 1000

export default class PushPullComponent {
  viewModel: PushPullViewModel;
  currentError: ?Error;
  subscriptions: CompositeDisposable;

  constructor (props: PushPullComponentProps) {
    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({viewModel}: PushPullComponentProps): Promise<void> {
    this.viewModel = viewModel

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(viewModel.onDidUpdate(() => etch.update(this)))

    if (this.element) {
      return etch.update(this)
    } else {
      etch.initialize(this)
      return Promise.resolve()
    }
  }

  update (props: PushPullComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  renderError () {
    const error = this.currentError
    if (!error) return null

    return (
      <div className='git-Error'>
        <span className='git-Error-name'>
          <span className='icon icon-alert'/>
          {error.name}
        </span>
        <span className='git-Error-message'>
          {error.message}
        </span>
      </div>
    )
  }

  renderProgress () {
    if (!this.viewModel.hasRequestsInFlight()) return null

    let percentage = this.viewModel.getProgressPercentage()
    if (percentage === 0) {
      return (
        <div className='git-Progress'>
          <progress className='git-Progress-bar'/>
        </div>
      )
    } else {
      return (
        <div className='git-Progress'>
          <progress className='git-Progress-bar' value={percentage}/>
        </div>
      )
    }
  }

  render () {
    // `standard` get upset about us using `onclick` instead of `onClick`, but
    // virtual-dom doesn't pass through `onclick`. So silence `standard`.
    /*eslint-disable*/
    return (
      <div className='git-Panel-item'>
        <div className='git-PushPull '>
          <span className='git-PushPull-item icon icon-mark-github'/>
          <button className='git-PushPull-item btn' onclick={() => this.fetch()} disabled={this.viewModel.hasRequestsInFlight()}>Fetch</button>

          <div className='git-PushPull-item is-flexible btn-group'>
            {this.renderPullButton()}
            {this.renderPushButton()}
          </div>
        </div>
        {this.renderProgress()}
        {this.renderError()}
      </div>
    )
    /*eslint-enable*/
  }

  renderPushButton () {
    let label = this.viewModel.getAheadCount() === 0 ? "Push" : `Push (${this.viewModel.getAheadCount()})`
    return (
      <button className='btn' onclick={() => this.push()} disabled={this.viewModel.hasRequestsInFlight()}>
        <span className='icon icon-arrow-up'/>
        {label}
      </button>
    )
  }

  renderPullButton () {
    let label = this.viewModel.getBehindCount() === 0 ? "Pull" : `Pull (${this.viewModel.getBehindCount()})`
    return (
      <button className='btn' onclick={() => this.pull()} disabled={this.viewModel.hasRequestsInFlight()}>
        <span className='icon icon-arrow-down'/>
        {label}
      </button>
    )
  }

  async performOperation (fn: () => Promise<void>): Promise<void> {
    etch.update(this)

    this.clearError()

    try {
      await fn()
    } catch (e) {
      this.currentError = e

      console.error(e)
    }

    etch.update(this)

    setTimeout(() => this.clearError(), ErrorTimeout)
  }

  clearError () {
    this.currentError = null
    etch.update(this)
  }

  async fetch (): Promise<void> {
    return this.performOperation(() => this.viewModel.fetch())
  }

  async pull (): Promise<void> {
    return this.performOperation(() => this.viewModel.pull())
  }

  async push (): Promise<void> {
    return this.performOperation(() => this.viewModel.push())
  }
}
