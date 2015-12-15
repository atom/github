/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import Common from './common'

export default class FileListComponent {
  constructor ({fileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.fileList.onDidChange(update)
    this.fileListViewModel.onDidChange(update)

    atom.commands.add(this.element, 'core:move-up', () => {
      this.fileListViewModel.moveSelectionUp()
    })
    atom.commands.add(this.element, 'core:move-down', () => {
      this.fileListViewModel.moveSelectionDown()
    })
    atom.commands.add(this.element, 'git:open-diff', () => {
      let fileSummary = this.fileListViewModel.getSelectedFileSummary()
      console.log('open', Common.DiffURI + fileSummary.getPathName())
      atom.workspace.open(Common.DiffURI + fileSummary.getPathName())
    })
  }

  render () {
    return (
      <div className="git-file-status-list" tabIndex="-1">
        <div className="column-header">
          Changes
        </div>
        <div className="files">{
          this.fileList.getFiles().map((fileSummary, index) =>
            <div className={`file-summary ${this.getSelectedClassForIndex(index)}`} key={fileSummary.getPathName()}>
              {this.getIconForFileSummary(fileSummary)}
              <span className="path">
                {fileSummary.getPathName()}
              </span>
            </div>
          )
        }</div>
      </div>
    )
  }

  getSelectedClassForIndex(index) {
    return this.fileListViewModel.getSelectedIndex() === index ? 'selected' : ''
  }

  getIconForFileSummary(fileSummary) {
    let changeStatus = fileSummary.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
