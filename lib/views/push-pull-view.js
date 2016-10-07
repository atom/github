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
        <span className="icon icon-arrow-down" />{this.props.behindCount !== 0 ? `${this.props.behindCount}` : ''}
        <span className="icon icon-arrow-up" />{this.props.aheadCount !== 0 ? `${this.props.aheadCount}` : ''}
      </div>
    )
  }
}
