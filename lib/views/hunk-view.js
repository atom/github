import React from 'react';
import {autobind} from 'core-decorators';

export default class HunkView extends React.Component {
  static propTypes = {
    hunk: React.PropTypes.object.isRequired,
    headHunk: React.PropTypes.object.isRequired,
    headLine: React.PropTypes.object.isRequired,
    isSelected: React.PropTypes.bool.isRequired,
    selectedLines: React.PropTypes.instanceOf(Set).isRequired,
    hunkSelectionMode: React.PropTypes.bool.isRequired,
    stageButtonLabel: React.PropTypes.string.isRequired,
    mousedownOnHeader: React.PropTypes.func.isRequired,
    mousedownOnLine: React.PropTypes.func.isRequired,
    mousemoveOnLine: React.PropTypes.func.isRequired,
    contextMenuOnItem: React.PropTypes.func.isRequired,
    didClickStageButton: React.PropTypes.func.isRequired,
    registerView: React.PropTypes.func,
  }

  constructor(props, context) {
    super(props, context);

    this.lineElements = new WeakMap();
    this.lastMousemoveLine = null;

    if (props.registerView != null) { props.registerView(props.hunk, this); } // only for tests
  }

  render() {
    const hunkSelectedClass = this.props.isSelected ? 'is-selected' : '';
    const hunkModeClass = this.props.hunkSelectionMode ? 'is-hunkMode' : '';

    return (
      <div className={`github-HunkView ${hunkModeClass} ${hunkSelectedClass}`} ref={e => { this.element = e; }}>
        <div className="github-HunkView-header"
          onMouseDown={e => this.props.mousedownOnHeader(e)}>
          <span className="github-HunkView-title">
            {this.props.hunk.getHeader().trim()} {this.props.hunk.getSectionHeading().trim()}
          </span>
          <button
            className="github-HunkView-stageButton"
            onClick={this.props.didClickStageButton}
            onMouseDown={event => event.stopPropagation()}>
            {this.props.stageButtonLabel}
          </button>
        </div>
        {this.props.hunk.getLines().map((line, idx) =>
          <LineView
            key={idx}
            line={line}
            isSelected={this.props.selectedLines.has(line)}
            registerLineElement={this.registerLineElement}
            mousedown={this.mousedownOnLine}
            mousemove={this.mousemoveOnLine}
            contextMenuOnItem={(e, clickedLine) => this.props.contextMenuOnItem(e, this.props.hunk, clickedLine)}
          />,
        )}
      </div>
    );
  }

  @autobind
  mousedownOnLine(event, line) {
    this.props.mousedownOnLine(event, this.props.hunk, line);
  }

  @autobind
  mousemoveOnLine(event, line) {
    if (line !== this.lastMousemoveLine) {
      this.lastMousemoveLine = line;
      this.props.mousemoveOnLine(event, this.props.hunk, line);
    }
  }

  @autobind
  registerLineElement(line, element) {
    this.lineElements.set(line, element);
  }

  componentDidUpdate() {
    if (this.props.headHunk === this.props.hunk) {
      this.element.scrollIntoViewIfNeeded();
    } else if (this.props.headLine && this.lineElements.has(this.props.headLine)) {
      this.lineElements.get(this.props.headLine).scrollIntoViewIfNeeded();
    }
  }
}

class LineView extends React.Component {
  static propTypes = {
    line: React.PropTypes.object.isRequired,
    isSelected: React.PropTypes.bool.isRequired,
    mousedown: React.PropTypes.func.isRequired,
    mousemove: React.PropTypes.func.isRequired,
    contextMenuOnItem: React.PropTypes.func.isRequired,
    registerLineElement: React.PropTypes.func.isRequired,
  }

  render() {
    const line = this.props.line;
    const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber();
    const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber();
    const lineSelectedClass = this.props.isSelected ? 'is-selected' : '';

    return (
      <div
        className={`github-HunkView-line ${lineSelectedClass} is-${line.getStatus()}`}
        onMouseDown={event => this.props.mousedown(event, line)}
        onMouseMove={event => this.props.mousemove(event, line)}
        onContextMenu={event => this.props.contextMenuOnItem(event, line)}
        ref={e => this.props.registerLineElement(line, e)}>
        <div className="github-HunkView-lineNumber is-old">{oldLineNumber}</div>
        <div className="github-HunkView-lineNumber is-new">{newLineNumber}</div>
        <div className="github-HunkView-lineContent">
          <span className="github-HunkView-plusMinus">{line.getOrigin()}</span>
          <span>{line.getText()}</span>
        </div>
      </div>
    );
  }
}
