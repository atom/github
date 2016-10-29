/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {classNameForStatus} from '../helpers'

const statusSymbolMap = {
  added: '+',
  removed: '-',
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
    const status = classNameForStatus[mergeConflict.getFileStatus()]
    const className = selected ? 'is-selected' : ''

    return (
      <div {...others} className={`git-FilePatchListView-item is-${status} ${className}`}>
        <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
        <span className='git-FilePatchListView-path'>{mergeConflict.getPath()}</span>
        <span className={'git-FilePatchListView ours-theirs-info'}>
          {statusSymbolMap[mergeConflict.getOursStatus()]}
          {statusSymbolMap[mergeConflict.getTheirsStatus()]}
        </span>
      </div>
    )
  }
}
