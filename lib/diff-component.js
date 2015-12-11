"use babel"

let etch = require('etch')

/** @jsx etch.dom */

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)
  }

  render () {
    let fontFamily = atom.config.get('editor.fontFamily')
    let fontSize = atom.config.get('editor.fontSize')
    // let style = `font-family: ${fontFamily}; font-size: ${fontSize}`
    let style = {
      'font-family': fontFamily,
      'font-size': fontSize + 'px'
    }
    return (
      <div className="pane-item git-diff-container" tabIndex="-1" style={style}>{
        this.diffViewModel.getFileDiffs().map(fileDiff =>
          <FileDiffComponent fileDiff={fileDiff}/>
        )
      }</div>
    )
  }
}

class FileDiffComponent {
  constructor ({fileDiff}) {
    this.fileDiff = fileDiff
    etch.createElement(this)
  }

  render () {
    return (
      <div className="git-file-diff">
        <div className="patch-description">
          {this.getIconForFileSummary(this.fileDiff)}
          <span className="text">
            <strong className="path">{this.fileDiff.getNewPathName()}</strong>
          </span>
        </div>
        {this.fileDiff.getHunks().map(diffHunk =>
          <DiffHunkComponent diffHunk={diffHunk}/>
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
  constructor ({diffHunk}) {
    this.diffHunk = diffHunk
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
        {this.diffHunk.getLines().map(hunkLine =>
          <HunkLineComponent hunkLine={hunkLine}/>
        )}
      </div>
    )
  }
}

class HunkLineComponent {
    constructor ({hunkLine}) {
    this.hunkLine = hunkLine
    etch.createElement(this)
  }

  render () {
    let additionOrDeletion = ''
    if (this.hunkLine.isAddition())
      additionOrDeletion = 'addition'
    else if (this.hunkLine.isDeletion())
      additionOrDeletion = 'deletion'

    return (
      <div className={`git-hunk-line ${additionOrDeletion}`}>
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
