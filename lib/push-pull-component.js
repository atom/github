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
    return (
      <div className='git-PushPull btn-toolbar'>
        <span className='icon icon-mark-github'/>
        <button className='btn' onClick={() => this.fetch()}>Fetch</button>

        <div className='btn-group'>
          <button className='btn' onClick={() => this.pull()}>
            <span className='icon icon-arrow-down'/>
            Pull
          </button>
          <button className='btn' onClick={() => this.push()}>
            <span className='icon icon-arrow-up'/>
            Push
          </button>
        </div>
      </div>
    )
  }

  async performOperation (fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (e) {
      this.currentError = e
      // TODO: Actually display this error.
      etch.update(this)
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
