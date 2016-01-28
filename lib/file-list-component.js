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
      let fileDiff = this.fileListViewModel.getSelectedFile()
      console.log('open', Common.DiffURI + fileDiff.getNewPathName())
      atom.workspace.open(Common.DiffURI + fileDiff.getNewPathName())
    })
  }

  render () {
    return (
      <div className="git-file-status-list" tabIndex="-1">
        <div className="column-header">
          Changes
        </div>
        <div className="files">{
          this.fileList.getFiles().map((fileDiff, index) =>
            <div className={`file-summary ${this.getSelectedClassForIndex(index)}`} key={fileDiff.getNewPathName()}>
              {this.getIconForFileDiff(fileDiff)}
              <span className="path">
                {fileDiff.getNewPathName()}
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

  getIconForFileDiff(fileDiff) {
    let changeStatus = fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
