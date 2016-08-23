/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

export default stateless(etch, ({filePatch, selected, selectItem, selectionEnabled, ...others}) => {
  const status = filePatch.getStatus()
  const className = selected ? 'is-selected' : ''

  let mousedOverItem = false
  const selectItemIfSelectionEnabled = () => {
    if (!mousedOverItem) {
      if (selectionEnabled) selectItem(filePatch)
      mousedOverItem = true
    }
  }

  return (
    <div {...others} className={`git-FilePatchListView-item is-${status} ${className}`}
        onmousemove={() => selectItemIfSelectionEnabled()}
        onmouseup={() => selectItemIfSelectionEnabled()}>
      <span className={`git-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
      <span className='git-FilePatchListView-path'>{filePatch.getPath()}</span>
    </div>
  )
})
