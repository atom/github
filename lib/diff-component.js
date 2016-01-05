/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.diffViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    let selectClickedLine = this.selectClickedLine.bind(this)
    this.subscriptions = new CompositeDisposable
    this.subscriptions.add(listener.add('.old-line-number', 'click', selectClickedLine))
    this.subscriptions.add(listener.add('.new-line-number', 'click', selectClickedLine))

    atom.commands.add(this.element, {
      'core:move-up': () => this.diffViewModel.moveSelectionUp(),
      'core:move-down': () => this.diffViewModel.moveSelectionDown(),
      'core:confirm': () => this.diffViewModel.toggleSelectedLinesStageStatus(),
      'git:expand-selection-up': () => this.diffViewModel.expandSelectionUp(),
      'git:expand-selection-down': () => this.diffViewModel.expandSelectionDown(),
      'git:toggle-selection-mode': () => this.diffViewModel.toggleSelectionMode()
    })
  }

  focus() {
    this.element.focus()
  }

  destroy() {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.listener.destroy()
  }

  selectClickedLine(event) {
    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)
    console.log('click', event.target, linePosition);
  }

  getLineElementFromTarget(targetElement) {
    // TODO: Make this better. Use $.closest-esque thing
    return targetElement.parentNode
  }

  getLinePositionFromElement(lineElement) {
    let lineComponent = lineElement.component
    if (!lineComponent || !lineComponent.getPosition)
      return null
    return lineElement.component.getPosition()
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
          <FileDiffComponent fileDiff={fileDiff} fileIndex={index} diffViewModel={this.diffViewModel}/>
        )
      }</div>
    )
  }
}

class FileDiffComponent {
  constructor ({fileDiff, fileIndex, diffViewModel}) {
    this.fileIndex = fileIndex
    this.fileDiff = fileDiff
    this.diffViewModel = diffViewModel
    etch.createElement(this)
    this.element.component = this
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
        {this.fileDiff.getHunks().map((diffHunk, index) =>
          <DiffHunkComponent diffHunk={diffHunk} fileIndex={this.fileIndex} hunkIndex={index} diffViewModel={this.diffViewModel}/>
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
  constructor ({diffHunk, fileIndex, hunkIndex, diffViewModel}) {
    this.diffHunk = diffHunk
    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.diffViewModel = diffViewModel
    etch.createElement(this)
    this.element.component = this
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
          <HunkLineComponent
            hunkLine={hunkLine}
            selected={this.diffViewModel.isLineSelected(this.fileIndex, this.hunkIndex, index)}
            fileIndex={this.fileIndex}
            hunkIndex={this.hunkIndex}
            lineIndex={index}
          />
        )}
      </div>
    )
  }
}

class HunkLineComponent {
    constructor ({hunkLine, fileIndex, hunkIndex, lineIndex, selected}) {
    this.hunkLine = hunkLine
    this.selected = selected

    this.fileIndex = fileIndex
    this.hunkIndex = hunkIndex
    this.lineIndex = lineIndex

    let update = () => etch.updateElement(this)
    this.hunkLine.onDidChange(update)

    etch.createElement(this)
    this.element.component = this
  }

  getPosition() {
    return [this.fileIndex, this.hunkIndex, this.lineIndex]
  }

  render () {
    let additionOrDeletion = ''
    if (this.hunkLine.isAddition())
      additionOrDeletion = 'addition'
    else if (this.hunkLine.isDeletion())
      additionOrDeletion = 'deletion'

    let selected = this.selected ? 'selected' : ''
    let staged = this.hunkLine.isStaged() ? 'staged' : ''

    return (
      <div className={`git-hunk-line ${additionOrDeletion} ${selected} ${staged}`}>
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
