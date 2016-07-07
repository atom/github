/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class PushPullView {
  constructor ({push, pull, fetch, aheadCount, behindCount, pullDisabled}) {
    this.push = push
    this.pull = pull
    this.fetch = fetch
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    this.pullDisabled = pullDisabled
    etch.initialize(this)
  }

  update ({push, pull, fetch, aheadCount, behindCount, pullDisabled}) {
    this.push = push
    this.pull = pull
    this.fetch = fetch
    this.aheadCount = aheadCount
    this.behindCount = behindCount
    this.pullDisabled = pullDisabled
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-Panel-item'>
        <div className='git-PushPull '>
          <span className='git-PushPull-item icon icon-mark-github'/>
          <button className='git-PushPull-item btn' onclick={this.fetch}>Fetch</button>

          <div className='git-PushPull-item is-flexible btn-group'>
            <Tooltip active={this.pullDisabled} text='Commit changes before pulling' className='btn-wrapper'>
              <button className='btn' onclick={this.pull} disabled={this.pullDisabled}>
                <span className='icon icon-arrow-down'/>
                Pull {this.behindCount !== 0 ? `(${this.behindCount})` : ''}
              </button>
            </Tooltip>
            <button className='btn' onclick={this.push}>
              <span className='icon icon-arrow-up'/>
              Push {this.aheadCount !== 0 ? `(${this.aheadCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

class Tooltip {
  constructor ({active, text, ...otherProps}, children) {
    this.active = active
    this.text = text
    this.children = children
    this.otherProps = otherProps
    this.handleMouseOut = this.handleMouseOut.bind(this)
    this.handleMouseOver = this.handleMouseOver.bind(this)
    etch.initialize(this)
  }

  update ({active, text, ...otherProps}, children) {
    this.active = active
    this.text = text
    this.children = children
    this.otherProps = otherProps
    return etch.update(this)
  }

  handleMouseOut () {
    if (this.tooltipDisposable) {
      this.tooltipDisposable.dispose()
      this.tooltipDisposable = null
    }
  }

  handleMouseOver () {
    if (this.active && !this.tooltipDisposable) {
      const element = this.element
      this.tooltipDisposable = atom.tooltips.add(element, {title: this.text, trigger: 'manual'})
    }
  }

  render () {
    return <div {...this.otherProps} onmouseover={this.handleMouseOver} onmouseout={this.handleMouseOut}>{this.children}</div>
  }

  destroy () {
    this.tooltipDisposable && this.tooltipDisposable.dispose()
    etch.destroy(this)
  }
}
