/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class ChangedFilesCountView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = {...this.props, ...props}
    return etch.update(this)
  }

  render () {
    const label =
      (this.props.changedFilesCount === 1)
        ? '1 file'
        : `${this.props.changedFilesCount} files`
    return (
      <a
        ref='changedFiles'
        className='git-ChangedFilesCount inline-block icon icon-diff'
        onclick={this.props.didClick}>{label}</a>
    )
  }
}
