/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FileDiffListComponent from './file-diff-list-component'

export default class ChangeListsComponent {
  constructor ({stagedFileDiffs, unstagedFileDiffs, onDidClickStagedFileDiff, onDidClickUnstagedFileDiff, onDidDoubleClickStagedFileDiff, onDidDoubleClickUnstagedFileDiff}) {
    this.stagedFileDiffs = stagedFileDiffs
    this.unstagedFileDiffs = unstagedFileDiffs
    this.onDidClickStagedFileDiff = onDidClickStagedFileDiff
    this.onDidClickUnstagedFileDiff = onDidClickUnstagedFileDiff
    this.onDidDoubleClickStagedFileDiff = onDidDoubleClickStagedFileDiff
    this.onDidDoubleClickUnstagedFileDiff = onDidDoubleClickUnstagedFileDiff

    this.unstagedSelectedFileDiff = null
    this.stagedSelectedFileDiff = null
    etch.initialize(this)
  }

  didClickStagedFileDiff (fileDiff) {
    this.unstagedSelectedFileDiff = null
    this.stagedSelectedFileDiff = fileDiff
    this.onDidClickStagedFileDiff(fileDiff)
    etch.update(this)
  }

  didDoubleClickStagedFileDiff (fileDiff) {
    this.onDidDoubleClickStagedFileDiff(fileDiff)
  }

  didClickUnstagedFileDiff (fileDiff) {
    this.unstagedSelectedFileDiff = fileDiff
    this.stagedSelectedFileDiff = null
    this.onDidClickUnstagedFileDiff(fileDiff)
    etch.update(this)
  }

  didDoubleClickUnstagedFileDiff (fileDiff) {
    this.onDidDoubleClickUnstagedFileDiff(fileDiff)
  }

  update ({stagedFileDiffs, unstagedFileDiffs}) {
    this.stagedFileDiffs = stagedFileDiffs
    this.unstagedFileDiffs = unstagedFileDiffs
    return etch.update(this)
  }

  render () {
    return (
      <div className="git-FileList-Container" style={{width: 200}}>
        <div className="git-Panel-item is-flexible git-StagedFiles">
          <header className='git-CommitPanel-item is-header'>Staged Files</header>
          <FileDiffListComponent
            onDidClickFileDiff={(fileDiff) => this.didClickStagedFileDiff(fileDiff)}
            onDidDoubleClickFileDiff={(fileDiff) => this.didDoubleClickStagedFileDiff(fileDiff)}
            fileDiffs={this.stagedFileDiffs}
            selectedFileDiff={this.stagedSelectedFileDiff} />
        </div>
        <div className="git-Panel-item is-flexible git-UnstagedFiles">
          <header className='git-CommitPanel-item is-header'>Unstaged Files</header>
          <FileDiffListComponent
            onDidClickFileDiff={(fileDiff) => this.didClickUnstagedFileDiff(fileDiff)}
            onDidDoubleClickFileDiff={(fileDiff) => this.didDoubleClickUnstagedFileDiff(fileDiff)}
            fileDiffs={this.unstagedFileDiffs}
            selectedFileDiff={this.unstagedSelectedFileDiff} />
        </div>
      </div>
    )
  }
}
