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
      <div className="git-PushPull inline-block" onclick={this.props.didClick}>
        <span className="git-PushPull-icon icon icon-arrow-down" />
        <span className="git-PushPull-label is-push" ref="behindCount">{this.props.behindCount ? `${this.props.behindCount}` : ''}</span>
        <span className="git-PushPull-icon icon icon-arrow-up" />
        <span className="git-PushPull-label is-pull" ref="aheadCount">{this.props.aheadCount ? `${this.props.aheadCount}` : ''}</span>
      </div>
    )
  }
}
