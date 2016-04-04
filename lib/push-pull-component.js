/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

import PushPullViewModel from './push-pull-view-model'

type PushPullComponentProps = {viewModel: PushPullViewModel}

export default class PushPullComponent {
  viewModel: PushPullViewModel;
  currentError: ?Error;

  constructor (props: PushPullComponentProps) {
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

  render () {
    // `standard` get upset about us using `onclick` instead of `onClick`, but
    // virtual-dom doesn't pass through `onclick`. So silence `standard`.
    /*eslint-disable*/
    return (
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
    )
    /*eslint-enable*/
  }

  async performOperation (fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (e) {
      this.currentError = e
      // TODO: Actually display this error.
      etch.update(this)

      console.error(e)
    }
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
