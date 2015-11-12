"use babel"

let etch = require('etch')
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
  constructor ({fileList}) {
    this.fileList = fileList
    etch.createElement(this)

    this.fileList.onDidChange(() => etch.updateElement(this))
  }

  render () {
    return (
      <div className="git-file-status-list">{
        this.fileList.getFiles().map(fileSummary =>
          <div className='file-summary' key={fileSummary.getPathName()}>
            {fileSummary.getPathName()}
          </div>
        )
      }</div>
    )
  }
}
