/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class ChangedFileComponent {
  constructor ({changedFile}) {
    this.changedFile = changedFile
    etch.initialize(this)
  }

  render () {
    const status = this.changedFile.getStatus()
    let fileName
    if (status === 'renamed') {
      fileName = `${this.changedFile.getOldName()} -> ${this.changedFile.getNewName()}`
    } else {
      fileName = this.changedFile.getNewName()
    }
    return (
      <div className={`git-ChangedFile ${status}`}>
        <span className='git-ChangedFile-checkbox git-Checkbox'></span>
        <span className='git-ChangedFile-path'>{fileName}</span>
        <span className={`git-ChangedFile-icon icon icon-diff-${status} status-${status}`}></span>
      </div>
    )
  }

  update ({changedFile}) {
    this.changedFile = changedFile
    return etch.update(this)
  }
}
