/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import ChangedFileComponent from './changed-file-component'

export default class StagingAreaComponent {
  constructor ({stagingArea}) {
    this.stagingArea = stagingArea
    this.subscription = this.stagingArea.onDidChange(() => this.update({stagingArea: this.stagingArea}))
    etch.initialize(this)
  }

  destroy () {
    this.subscription.dispose()
    etch.destroy(this)
  }

  render () {
    if (this.stagingArea.getChangedFiles().length === 0) {
      return (
        <div>No files were changed.</div>
      )
    } else {
      return (
        <div>{
          this.stagingArea.getChangedFiles().map((f) =>
            <ChangedFileComponent changedFile={f} />
          )
        }
        </div>
      )
    }
  }

  update ({stagingArea}) {
    this.stagingArea = stagingArea
    this.subscription.dispose()
    this.subscription = this.stagingArea.onDidChange(() => this.update({stagingArea: this.stagingArea}))
    return etch.update(this)
  }
}
