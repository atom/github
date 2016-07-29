/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

const statusMap = {
  A: 'added',
  M: 'modified',
  D: 'removed',
  E: 'ignored'
}

export default stateless(etch, ({mergeConflict, selected, ...others}) => {
  const status = statusMap[mergeConflict.getFileStatus()]
  const className = selected ? 'is-selected' : ''
  return (
    <div {...others} className={`git-FilePatchListView-item is-${status} ${className}`}>
      <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
      <span className='git-FilePatchListView-path'>{mergeConflict.getPath()}</span>
      <span className={'git-FilePatchListView ours-theirs-info'}> {mergeConflict.getOursStatus()}{mergeConflict.getTheirsStatus()} </span>
    </div>
  )
})
