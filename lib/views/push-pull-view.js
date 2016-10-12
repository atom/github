/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class PushPullView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = {...this.props, ...props}
    return etch.update(this)
  }

  render () {
    return (
      <div className="git-pushPull inline-block" onclick={this.props.didClick}>
        <span className="icon icon-arrow-down" />
        <span ref="behindCount">{this.props.behindCount !== 0 ? `${this.props.behindCount}` : ''}</span>
        <span className="icon icon-arrow-up" />
        <span ref="aheadCount">{this.props.aheadCount !== 0 ? `${this.props.aheadCount}` : ''}</span>
      </div>
    )
  }
}
