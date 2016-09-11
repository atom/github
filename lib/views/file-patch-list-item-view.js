/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

import {classNameForStatus} from '../helpers'

export default stateless(etch, ({filePatch, selected, selectItem, selectionEnabled, ...others}) => {
  const status = classNameForStatus[filePatch.getStatus()]
  const className = selected ? 'is-selected' : ''

  let itemAlreadySelected = false
  const selectItemIfSelectionEnabled = () => {
    if (!itemAlreadySelected) {
      if (selectionEnabled) {
        selectItem(filePatch)
        itemAlreadySelected = true
      }
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
