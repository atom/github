/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

import {classNameForStatus} from '../helpers'

const statusSymbolMap = {
  added: '+',
  removed: '-',
  modified: '*'
}

export default stateless(etch, ({mergeConflict, selected, selectItem, selectionEnabled, ...others}) => {
  let status = classNameForStatus[mergeConflict.getFileStatus()]
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
})
