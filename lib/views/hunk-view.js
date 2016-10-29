/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class HunkView {
  constructor (props) {
    this.lastMousemoveLine = null
    this.props = props
    if (props.registerView != null) props.registerView(props.hunk, this) // only for tests
    this.lineElements = new WeakMap()
    this.registerLineElement = this.lineElements.set.bind(this.lineElements)
    this.mousedownOnLine = this.mousedownOnLine.bind(this)
    this.mousemoveOnLine = this.mousemoveOnLine.bind(this)
    etch.initialize(this)
  }

  destroy () {
    return etch.destroy(this)
  }

  mousedownOnLine (event, line) {
    this.props.mousedownOnLine(event, this.props.hunk, line)
  }

  mousemoveOnLine (event, line) {
    if (line !== this.lastMousemoveLine) {
      this.lastMousemoveLine = line
      this.props.mousemoveOnLine(event, this.props.hunk, line)
    }
  }

  update (props) {
    this.props = props
    if (props.registerView != null) props.registerView(props.hunk, this) // only for tests
    return etch.update(this)
  }

  render () {
    const hunkSelectedClass = this.props.isSelected ? 'is-selected' : ''
    return (
      <div className={`git-HunkView ${hunkSelectedClass}`}>
        <div className='git-HunkView-header'
             onmousedown={() => this.props.mousedownOnHeader()}>
          <span ref='header' className='git-HunkView-title'>{this.props.hunk.getHeader()}</span>
          <button ref='stageButton'
                  className='git-HunkView-stageButton'
                  onclick={this.props.didClickStageButton}
                  onmousedown={event => event.stopPropagation()}>
            {this.props.stageButtonLabel}
          </button>
        </div>
        {this.props.hunk.getLines().map((line) =>
          <LineView line={line}
                    isSelected={this.props.selectedLines.has(line)}
                    registerLineElement={this.registerLineElement}
                    mousedown={this.mousedownOnLine}
                    mousemove={this.mousemoveOnLine} />
        )}
      </div>
    )
  }

  registerLineElement (line, element) {
    this.lineElements.set(line, element)
  }

  writeAfterUpdate () {
    if (this.props.headHunk === this.props.hunk) {
      this.element.scrollIntoViewIfNeeded()
    } else if (this.props.headLine && this.lineElements.has(this.props.headLine)) {
      this.lineElements.get(this.props.headLine).scrollIntoViewIfNeeded()
    }
  }
}

class LineView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
    this.props.registerLineElement(props.line, this.element)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    const line = this.props.line
    const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber()
    const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber()
    const lineSelectedClass = this.props.isSelected ? 'is-selected' : ''
    return (
      <div className={`git-HunkView-line ${lineSelectedClass} is-${line.getStatus()}`}
           onmousedown={(event) => this.props.mousedown(event, line)}
           onmousemove={(event) => this.props.mousemove(event, line)}>
        <div className='git-HunkView-lineNumber is-old'>{oldLineNumber}</div>
        <div className='git-HunkView-lineNumber is-new'>{newLineNumber}</div>
        <div className='git-HunkView-lineContent'>
          <span className='git-HunkView-plusMinus'>{line.getOrigin()}</span>
          <span>{line.getText()}</span>
        </div>
      </div>
    )
  }
}
