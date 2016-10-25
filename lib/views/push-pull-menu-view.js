/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class PushPullMenuView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return etch.update(this)
  }

  render () {
    return (
      <div className='git-Panel-item'>
        <div className='git-PushPullMenuView '>
          <span className='git-PushPullMenuView-item icon icon-mark-github'/>
          <button className='git-PushPullMenuView-item btn' onclick={this.props.fetch}>Fetch</button>

          <div className='git-PushPullMenuView-item is-flexible btn-group'>
            <button ref="pullButton" className='btn' onclick={this.props.pull} disabled={this.props.pullDisabled}>
              <Tooltip active={this.props.pullDisabled} text='Commit changes before pulling' className='btn-tooltip-wrapper'>
                <span className='icon icon-arrow-down'/>
                <span ref="behindCount">Pull {this.props.behindCount !== 0 ? `(${this.props.behindCount})` : ''}</span>
              </Tooltip>
            </button>
            <button className='btn' onclick={this.props.push}>
              <span className='icon icon-arrow-up'/>
              <span ref="aheadCount">Push {this.props.aheadCount !== 0 ? `(${this.props.aheadCount})` : ''}</span>
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
