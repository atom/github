/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class BranchView {
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
      <div className="git-branch inline-block" onclick={this.props.didClick}>
        <span className="icon icon-git-branch" />
        <span className="branch-label">{this.props.branchName}</span>
      </div>
    )
  }
}
