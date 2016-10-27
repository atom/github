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
    if (this.props.changedFilesCount === 0) {
      return <a style={{display: 'none'}} />
    } else {
      const label =
        (this.props.changedFilesCount === 1)
          ? '1 file'
          : `${this.props.changedFilesCount} files`
      return (
        <a
          ref='changedFiles'
          className='inline-block icon icon-diff'
          onclick={this.props.didClick}>{label}</a>
      )
    }
  }
}
