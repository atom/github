/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class PushPullView {
  constructor ({repository, aheadCount, behindCount}) {
    this.repository = repository
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    etch.initialize(this)
  }

  update ({repository, aheadCount, behindCount}) {
    this.repository = repository
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    return etch.update(this)
  }

  // async refreshAheadBehindCount () {
  //   await this.repository.fetch(this.branchName)
  //   return this.repository.getAheadBehindCount(this.branchName).then(({ahead, behind}) => {
  //     this.aheadCount = ahead
  //     this.behindCount = behind
  //     return etch.update(this)
  //   })
  // }

  render () {
    return (
      <div className='git-Panel-item'>
        <div className='git-PushPull '>
          <span className='git-PushPull-item icon icon-mark-github'/>
          <button className='git-PushPull-item btn' onclick={() => this.repository.fetch()}>Fetch</button>

          <div className='git-PushPull-item is-flexible btn-group'>
            <button className='btn' onclick={() => this.repository.pull()}>
              <span className='icon icon-arrow-down'/>
              Pull {this.behindCount !== 0 ? `(${this.behindCount})` : ''}
            </button>
            <button className='btn' onclick={() => this.repository.push()}>
              <span className='icon icon-arrow-up'/>
              Push {this.aheadCount !== 0 ? `(${this.aheadCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
