/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.diffViewModel.onDidChange(update)

    atom.commands.add(this.element, {
      'core:move-up': () => this.diffViewModel.moveSelectionUp(),
      'core:move-down': () => this.diffViewModel.moveSelectionDown(),
      'git:expand-selection-up': () => this.diffViewModel.expandSelectionUp(),
      'git:expand-selection-down': () => this.diffViewModel.expandSelectionDown(),
      'git:toggle-selection-mode': () => this.diffViewModel.toggleSelectionMode()
    })
  }

  focus() {
    this.element.focus()
  }

  render() {
    let fontFamily = atom.config.get('editor.fontFamily')
    let fontSize = atom.config.get('editor.fontSize')
    let style = {
      'font-family': fontFamily,
      'font-size': fontSize + 'px'
    }
    return (
      <div className="git-diff-container" tabIndex="-1" style={style}>{
        this.diffViewModel.getFileDiffs().map((fileDiff, index) =>
          <FileDiffComponent fileDiff={fileDiff} index={index} diffViewModel={this.diffViewModel}/>
        )
      }</div>
    )
  }
}

class FileDiffComponent {
  constructor ({fileDiff, index, diffViewModel}) {
    this.index = index
    this.fileDiff = fileDiff
    this.diffViewModel = diffViewModel
    etch.createElement(this)
  }

  render () {
    return (
      <div className="git-file-diff">
        <div className="patch-description">
          {this.getIconForFileSummary(this.fileDiff)}
          <span className="text">
            <strong className="path">{this.fileDiff.getNewPathName()} {this.index}</strong>
          </span>
        </div>
        {this.fileDiff.getHunks().map((diffHunk, index) =>
          <DiffHunkComponent diffHunk={diffHunk} fileDiffIndex={this.index} diffHunkIndex={index} diffViewModel={this.diffViewModel}/>
        )}
      </div>
    )
  }

  getIconForFileSummary(fileDiff) {
    let changeStatus = fileDiff.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}

class DiffHunkComponent {
  constructor ({diffHunk, fileDiffIndex, diffHunkIndex, diffViewModel}) {
    this.diffHunk = diffHunk
    this.fileDiffIndex = fileDiffIndex
    this.diffHunkIndex = diffHunkIndex
    this.diffViewModel = diffViewModel
    etch.createElement(this)
  }

  render () {
    return (
      <div className="git-diff-hunk">
        <div className="git-hunk-line diff-hunk-header">
          <div className="old-line-number"></div>
          <div className="new-line-number"></div>
          <div className="diff-hunk-data">
            {this.diffHunk.getHeader()}
          </div>
        </div>
        {this.diffHunk.getLines().map((hunkLine, index) =>
          <HunkLineComponent hunkLine={hunkLine} selected={this.diffViewModel.isLineSelected(this.fileDiffIndex, this.diffHunkIndex, index)}/>
        )}
      </div>
    )
  }
}

class HunkLineComponent {
    constructor ({hunkLine, selected}) {
    this.hunkLine = hunkLine
    this.selected = selected
    etch.createElement(this)
  }

  render () {
    let additionOrDeletion = ''
    if (this.hunkLine.isAddition())
      additionOrDeletion = 'addition'
    else if (this.hunkLine.isDeletion())
      additionOrDeletion = 'deletion'

    let selected = this.selected ? 'selected' : ''

    return (
      <div className={`git-hunk-line ${additionOrDeletion} ${selected}`}>
        <div className="old-line-number">
          {this.hunkLine.getOldLineNumber() || ''}
        </div>
        <div className="new-line-number">
          {this.hunkLine.getNewLineNumber() || ''}
        </div>
        <div className="diff-hunk-data">
          {this.hunkLine.getLineOrigin()}
          {this.hunkLine.getContent()}
        </div>
      </div>
    )
  }
}
