/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

const statusSymbolMap = {
  added: '+',
  removed: '-',
  modified: '*'
}

export default stateless(etch, ({mergeConflict, selected, selectItem, selectionEnabled, ...others}) => {
  let status = mergeConflict.getFileStatus()
  if (status === 'equivalent') status = 'ignored'
  const className = selected ? 'is-selected' : ''

  let mousedOverItem = false
  const selectItemIfSelectionEnabled = () => {
    if (!mousedOverItem) {
      if (selectionEnabled) selectItem(mergeConflict)
      mousedOverItem = true
    }
  }

  return (
    <div {...others} className={`git-FilePatchListView-item is-${status} ${className}`}
        onmousemove={() => selectItemIfSelectionEnabled()}
        onmouseup={() => selectItemIfSelectionEnabled()}>
      <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
      <span className='git-FilePatchListView-path'>{mergeConflict.getPath()}</span>
      <span className={'git-FilePatchListView ours-theirs-info'}>
        {statusSymbolMap[mergeConflict.getOursStatus()]}
        {statusSymbolMap[mergeConflict.getTheirsStatus()]}
      </span>
    </div>
  )
})
