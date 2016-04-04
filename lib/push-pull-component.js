/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

import PushPullViewModel from './push-pull-view-model'

type PushPullComponentProps = {viewModel: PushPullViewModel}

export default class PushPullComponent {
  viewModel: PushPullViewModel;
  currentError: ?Error;
  inFlightRequests: number;

  constructor (props: PushPullComponentProps) {
    this.inFlightRequests = 0

    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    return etch.destroy(this)
  }

  acceptProps ({viewModel}: PushPullComponentProps): Promise<void> {
    this.viewModel = viewModel

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
    if (!error) return <div></div>

    return (
      <div>
        {error.name} - {error.message}
      </div>
    )
  }

  renderProgress () {
    if (!this.inFlightRequests) return <div></div>

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
    this.inFlightRequests++
    etch.update(this)

    let threw = false
    try {
      await fn()
    } catch (e) {
      threw = true
      this.currentError = e

      console.error(e)
    }

    this.inFlightRequests--
    if (!threw) this.currentError = null
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
