/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class ChangedFileComponent {
  constructor ({changedFile}) {
    this.changedFile = changedFile
    etch.initialize(this)
  }

  render () {
    let fileName
    if (this.changedFile.getStatus() === 'renamed') {
      fileName = `${this.changedFile.getOldName()} -> ${this.changedFile.getNewName()}`
    } else {
      fileName = this.changedFile.getNewName()
    }
    return (
      <div className={`changed-file ${this.changedFile.getStatus()}`}>{fileName}</div>
    )
  }

  update ({changedFile}) {
    this.changedFile = changedFile
    return etch.update(this)
  }
}
