/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {classNameForStatus} from '../helpers'

const statusSymbolMap = {
  added: '+',
  deleted: '-',
  modified: '*'
}

export default class FilePatchListItemView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
    this.props.registerItemElement(this.props.mergeConflict, this.element)
  }

  update (props) {
    this.props = props
    this.props.registerItemElement(this.props.mergeConflict, this.element)
    return etch.update(this)
  }

  render () {
    const {mergeConflict, selected, ...others} = this.props
    const fileStatus = classNameForStatus[mergeConflict.status.file]
    const oursStatus = classNameForStatus[mergeConflict.status.ours]
    const theirsStatus = classNameForStatus[mergeConflict.status.theirs]
    const className = selected ? 'is-selected' : ''

    return (
      <div {...others} className={`git-FilePatchListView-item is-${fileStatus} ${className}`}>
        <span className={`git-FilePatchListView-icon icon icon-diff-${fileStatus} status-${fileStatus}`} />
        <span className='git-FilePatchListView-path'>{mergeConflict.filePath}</span>
        <span className={'git-FilePatchListView ours-theirs-info'}>
          <span className={`git-FilePatchListView-icon icon icon-diff-${oursStatus}`} />
          <span className={`git-FilePatchListView-icon icon icon-diff-${theirsStatus}`} />
        </span>
      </div>
    )
  }
}
