import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import SimpleTooltip from './simple-tooltip';
import ContextMenuInterceptor from '../context-menu-interceptor';

export default class HunkView extends React.Component {
  static propTypes = {
    tooltips: PropTypes.object.isRequired,
    hunk: PropTypes.object.isRequired,
    headHunk: PropTypes.object,
    headLine: PropTypes.object,
    isSelected: PropTypes.bool.isRequired,
    selectedLines: PropTypes.instanceOf(Set).isRequired,
    hunkSelectionMode: PropTypes.bool.isRequired,
    stageButtonLabel: PropTypes.string.isRequired,
    discardButtonLabel: PropTypes.string.isRequired,
    unstaged: PropTypes.bool.isRequired,
    mousedownOnHeader: PropTypes.func.isRequired,
    mousedownOnLine: PropTypes.func.isRequired,
    mousemoveOnLine: PropTypes.func.isRequired,
    contextMenuOnItem: PropTypes.func.isRequired,
    didClickStageButton: PropTypes.func.isRequired,
    didClickDiscardButton: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.lineElements = new WeakMap();
    this.lastMousemoveLine = null;
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
          {this.props.unstaged &&
            <SimpleTooltip
              tooltips={this.props.tooltips}
              title={this.props.discardButtonLabel}>
              <button
                className="icon-trashcan github-HunkView-discardButton"
                onClick={this.props.didClickDiscardButton}
                onMouseDown={event => event.stopPropagation()}
              />
            </SimpleTooltip>
          }
        </div>
        {this.props.hunk.getLines().map((line, idx) => (
          <LineView
            key={idx}
            line={line}
            isSelected={this.props.selectedLines.has(line)}
            registerLineElement={this.registerLineElement}
            mousedown={this.mousedownOnLine}
            mousemove={this.mousemoveOnLine}
            contextMenuOnItem={(e, clickedLine) => this.props.contextMenuOnItem(e, this.props.hunk, clickedLine)}
          />
        ))}
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
    const selectedLine = Array.from(this.props.selectedLines)[0];
    if (selectedLine && this.lineElements.get(selectedLine)) {
      // QUESTION: why is this setTimeout needed?
      const element = this.lineElements.get(selectedLine);
      setTimeout(() => {
        element.scrollIntoViewIfNeeded();
      }, 0);
    } else if (this.props.headHunk === this.props.hunk) {
      this.element.scrollIntoViewIfNeeded();
    } else if (this.props.headLine && this.lineElements.has(this.props.headLine)) {
      this.lineElements.get(this.props.headLine).scrollIntoViewIfNeeded();
    }
  }
}

class LineView extends React.Component {
  static propTypes = {
    line: PropTypes.object.isRequired,
    isSelected: PropTypes.bool.isRequired,
    mousedown: PropTypes.func.isRequired,
    mousemove: PropTypes.func.isRequired,
    contextMenuOnItem: PropTypes.func.isRequired,
    registerLineElement: PropTypes.func.isRequired,
  }

  render() {
    const line = this.props.line;
    const oldLineNumber = line.getOldLineNumber() === -1 ? ' ' : line.getOldLineNumber();
    const newLineNumber = line.getNewLineNumber() === -1 ? ' ' : line.getNewLineNumber();
    const lineSelectedClass = this.props.isSelected ? 'is-selected' : '';

    return (
      <ContextMenuInterceptor onWillShowContextMenu={event => this.props.contextMenuOnItem(event, line)}>
        <div
          className={`github-HunkView-line ${lineSelectedClass} is-${line.getStatus()}`}
          onMouseDown={event => this.props.mousedown(event, line)}
          onMouseMove={event => this.props.mousemove(event, line)}
          ref={e => this.props.registerLineElement(line, e)}>
          <div className="github-HunkView-lineNumber is-old">{oldLineNumber}</div>
          <div className="github-HunkView-lineNumber is-new">{newLineNumber}</div>
          <div className="github-HunkView-lineContent">
            <span className="github-HunkView-plusMinus">{line.getOrigin()}</span>
            <span>{line.getText()}</span>
          </div>
        </div>
      </ContextMenuInterceptor>
    );
  }
}
