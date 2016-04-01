/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

export default class PushPullComponent {
  constructor () {
    this.acceptProps({})
  }

  destroy (): Promise<void> {
    return etch.destroy(this)
  }

  acceptProps (props: {}): Promise<void> {
    if (this.element) {
      return etch.update(this)
    } else {
      etch.initialize(this)
      return Promise.resolve()
    }
  }

  update (props: {}, children: Array<any>): Promise<void> {
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

  fetch () {

  }

  pull () {

  }

  push () {

  }
}
