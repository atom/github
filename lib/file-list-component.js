/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

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
      this.fileListViewModel.openSelectedFileDiff()
    })
  }

  render () {
    return (
      <div className='git-file-status-list' tabIndex='-1'>
        <div className='column-header'>
          Changes
        </div>
        <div className='files'>{
          this.fileList.getFiles().map((fileDiff, index) =>
            <div className={`file-summary ${this.getSelectedClassForIndex(index)}`} key={fileDiff.getNewPathName()}>
              {this.getStagingCheckboxForFileDiff(fileDiff)}
              {this.getIconForFileDiff(fileDiff)}
              <span className='path'>
                {fileDiff.getNewPathName()}
              </span>
            </div>
          )
        }</div>
      </div>
    )
  }

  getSelectedClassForIndex (index) {
    return this.fileListViewModel.getSelectedIndex() === index ? 'selected' : ''
  }

  getStagingCheckboxForFileDiff (fileDiff) {
    let stageStatus = fileDiff.getStageStatus()
    return (
      <span className={`stage-status stage-status-${stageStatus}`}></span>
    )
  }

  getIconForFileDiff (fileDiff) {
    let changeStatus = fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
