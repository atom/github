"use babel"

let etch = require('etch')
let Common = require('./common')

/** @jsx etch.dom */

// let BaseTemplate = ```
//   <div class="unstaged column-header">Unstaged changes
//     <button class="btn btn-xs btn-stage-all">Stage all</button>
//   </div>
//   <div class="unstaged files"></div>
//   <div class="staged column-header">Staged changes
//     <button class="btn btn-xs btn-unstage-all">Unstage all</button>
//   </div>
//   <div class="staged files"></div>
//   <div class="staged column-header">Commit message</div>
//   <div class="commit-message-box"></div>
//   <div class="undo-last-commit-box"></div>
// ```

export default class FileListComponent {
  constructor ({fileListViewModel}) {
    this.fileList = fileListViewModel.getFileList()
    this.fileListViewModel = fileListViewModel
    etch.createElement(this)

    update = () => etch.updateElement(this)
    this.fileList.onDidChange(update)
    this.fileListViewModel.onDidChange(update)

    atom.commands.add(this.element, 'core:move-up', () => {
      this.fileListViewModel.selectPrevious()
    })
    atom.commands.add(this.element, 'core:move-down', () => {
      this.fileListViewModel.selectNext()
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
