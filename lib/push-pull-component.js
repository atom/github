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
      <div>
        {error.name} - {error.message}
      </div>
    )
  }

  renderProgress () {
    if (!this.viewModel.hasRequestsInFlight()) return null

    return (
      <div className='block'>
        <progress className='inline-block'/>
      </div>
    )
  }

  render () {
    // `standard` get upset about us using `onclick` instead of `onClick`, but
    // virtual-dom doesn't pass through `onclick`. So silence `standard`.
    /*eslint-disable*/
    return (
      <div>
        <div className='git-PushPull btn-toolbar'>
          <span className='icon icon-mark-github'/>
          <button className='btn' onclick={() => this.fetch()}>Fetch</button>

          <div className='btn-group'>
            <button className='btn' onclick={() => this.pull()}>
              <span className='icon icon-arrow-down'/>
              Pull
            </button>
            <button className='btn' onclick={() => this.push()}>
              <span className='icon icon-arrow-up'/>
              Push
            </button>
          </div>
        </div>
        {this.renderProgress()}
        {this.renderError()}
      </div>
    )
    /*eslint-enable*/
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
