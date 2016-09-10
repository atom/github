/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class HunkView {
  constructor (props) {
    this.props = props
    if (props.registerView != null) props.registerView(props.hunk, this) // only for tests
    etch.initialize(this)
  }

  destroy () {
    return etch.destroy(this)
  }

  selectLine (hunkLine) {
    if (this.props.selectionEnabled && hunkLine.isChanged() && this.lastSelected !== hunkLine) {
      this.props.selectLine(hunkLine)
      this.lastSelected = hunkLine
    }
  }

  update (props) {
    this.props = props
    if (props.registerView != null) props.registerView(props.hunk, this) // only for tests
    return etch.update(this)
  }

  render () {
    const hunkSelectedClass = this.props.isSelected ? 'is-selected' : ''
    let stageButtonLabel = this.props.stageButtonLabelPrefix
    if (this.props.selectedLines.size === 0) {
      stageButtonLabel += ' Hunk'
    } else {
      stageButtonLabel += ' Selection'
    }

    return (
      <div className={`git-HunkView ${hunkSelectedClass}`}
           onclick={() => this.props.focusHunk()}>
        <div className='git-HunkView-header'>
          <span ref='header' className='git-HunkView-title'>{this.props.hunk.getHeader()}</span>
          <button ref='stageButton' className='git-HunkView-stageButton' onclick={this.props.didClickStageButton}>
            {stageButtonLabel}
          </button>
        </div>
        {this.props.hunk.getLines().map((line) => {
          const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
          const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
          const lineSelectedClass = this.props.selectedLines.has(line) ? 'is-selected' : ''
          return (
            <div className={`git-HunkView-line ${lineSelectedClass} is-${line.getStatus()}`}
                 onmousemove={() => this.selectLine(line)}
                 onmouseup={() => this.selectLine(line)}>
              <div className='git-HunkView-lineNumber is-old'>{oldLineNumber}</div>
              <div className='git-HunkView-lineNumber is-new'>{newLineNumber}</div>
              <div className='git-HunkView-lineContent'>
                <span>{line.getOrigin()}</span>
                <span>{line.getText()}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}
