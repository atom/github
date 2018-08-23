import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {Range} from 'atom';

import {autobind} from '../helpers';
import AtomTextEditor from '../atom/atom-text-editor';
import Marker from '../atom/marker';
import MarkerLayer from '../atom/marker-layer';
import Decoration from '../atom/decoration';
import Gutter from '../atom/gutter';
import FilePatchHeaderView from './file-patch-header-view';
import FilePatchMetaView from './file-patch-meta-view';
import HunkHeaderView from './hunk-header-view';
import RefHolder from '../models/ref-holder';

const executableText = {
  100644: 'non executable',
  100755: 'executable',
};

const NBSP_CHARACTER = '\u00a0';

export default class FilePatchView extends React.Component {
  static propTypes = {
    relPath: PropTypes.string.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    filePatch: PropTypes.object.isRequired,
    selection: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,

    tooltips: PropTypes.object.isRequired,

    mouseDownOnHeader: PropTypes.func.isRequired,
    mouseDownOnLineNumber: PropTypes.func.isRequired,
    mouseMoveOnLineNumber: PropTypes.func.isRequired,
    mouseUp: PropTypes.func.isRequired,

    diveIntoMirrorPatch: PropTypes.func.isRequired,
    openFile: PropTypes.func.isRequired,
    toggleFile: PropTypes.func.isRequired,
    selectAndToggleHunk: PropTypes.func.isRequired,
    toggleLines: PropTypes.func.isRequired,
    toggleModeChange: PropTypes.func.isRequired,
    toggleSymlinkChange: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    discardLines: PropTypes.func.isRequired,
    selectAndDiscardHunk: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(
      this,
      'didMouseDownOnLineNumber', 'didMouseMoveOnLineNumber', 'didMouseUp',
      'oldLineNumberLabel', 'newLineNumberLabel',
    );

    this.state = {
      lastSelection: this.props.selection,
      selectedHunks: this.props.selection.getSelectedHunks(),
      selectedLines: this.props.selection.getSelectedLines(),
      selectedLineRanges: Array.from(
        this.props.selection.getSelectedLines(),
        line => Range.fromObject([[line, 0], [line, 0]]),
      ),
    };

    this.lastMouseMoveLine = null;
    this.hunksByMarkerID = new Map();
    this.hunkMarkerLayerHolder = new RefHolder();
  }

  static getDerivedStateFromProps(props, state) {
    const nextState = {};

    if (props.selection !== state.lastSelection) {
      nextState.lastSelection = props.selection;
      nextState.selectedHunks = props.selection.getSelectedHunks();
      nextState.selectedLines = props.selection.getSelectedLines();
      nextState.selectedLineRanges = Array.from(
        props.selection.getSelectedLines(),
        line => Range.fromObject([[line, 0], [line, 0]]),
      );
    }

    return nextState;
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.didMouseUp);
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.didMouseUp);
  }

  render() {
    const rootClass = cx(
      'github-FilePatchView',
      `github-FilePatchView--${this.props.stagingStatus}`,
      {'github-FilePatchView--blank': !this.props.filePatch.isPresent()},
    );

    return (
      <div className={rootClass} tabIndex="-1">

        <FilePatchHeaderView
          relPath={this.props.relPath}
          stagingStatus={this.props.stagingStatus}
          isPartiallyStaged={this.props.isPartiallyStaged}
          hasHunks={this.props.filePatch.getHunks().length > 0}
          hasUndoHistory={this.props.repository.hasDiscardHistory(this.props.relPath)}

          tooltips={this.props.tooltips}

          undoLastDiscard={this.props.undoLastDiscard}
          diveIntoMirrorPatch={this.props.diveIntoMirrorPatch}
          openFile={this.props.openFile}
          toggleFile={this.props.toggleFile}
        />

        <main className="github-FilePatchView-container">
          {this.props.filePatch.isPresent() ? this.renderNonEmptyPatch() : this.renderEmptyPatch()}
        </main>

      </div>
    );
  }

  renderEmptyPatch() {
    return <p className="github-FilePatchView-message icon icon-info">No changes to display</p>;
  }

  renderNonEmptyPatch() {
    return (
      <AtomTextEditor
        text={this.props.filePatch.getBufferText()}
        preserveMarkers={true}
        lineNumberGutterVisible={false}
        autoWidth={false}
        autoHeight={false}
        readOnly={true}>

        <Gutter
          name="old-line-numbers"
          priority={1}
          className="old"
          type="line-number"
          labelFn={this.oldLineNumberLabel}
          onMouseDown={this.didMouseDownOnLineNumber}
          onMouseMove={this.didMouseMoveOnLineNumber}
        />
        <Gutter
          name="new-line-numbers"
          priority={2}
          className="new"
          type="line-number"
          labelFn={this.newLineNumberLabel}
          onMouseDown={this.didMouseDownOnLineNumber}
          onMouseMove={this.didMouseMoveOnLineNumber}
        />

        <Marker invalidate="never" bufferRange={Range.fromObject([[0, 0], [0, 0]])}>
          <Decoration type="block">
            <Fragment>
              {this.renderExecutableModeChangeMeta()}
              {this.renderSymlinkChangeMeta()}
            </Fragment>
          </Decoration>
        </Marker>

        {this.renderHunkHeaders()}

        {this.renderLineDecorations(
          this.state.selectedLineRanges,
          'github-FilePatchView-line--selected',
          {gutter: true},
        )}
        {this.renderLineDecorations(
          this.props.filePatch.getAdditionRanges(),
          'github-FilePatchView-line--added',
          {line: true},
        )}
        {this.renderLineDecorations(
          this.props.filePatch.getDeletionRanges(),
          'github-FilePatchView-line--deleted',
          {line: true},
        )}
        {this.renderLineDecorations(
          this.props.filePatch.getNoNewlineRanges(),
          'github-FilePatchView-line--nonewline',
          {line: true},
        )}

      </AtomTextEditor>
    );
  }

  renderExecutableModeChangeMeta() {
    if (!this.props.filePatch.didChangeExecutableMode()) {
      return null;
    }

    const oldMode = this.props.filePatch.getOldMode();
    const newMode = this.props.filePatch.getNewMode();

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        actionIcon: 'icon-move-down',
        actionText: 'Stage Mode Change',
      }
      : {
        actionIcon: 'icon-move-up',
        actionText: 'Unstage Mode Change',
      };

    return (
      <FilePatchMetaView
        title="Mode change"
        actionIcon={attrs.actionIcon}
        actionText={attrs.actionText}
        action={this.props.toggleModeChange}>
        <Fragment>
          File changed mode
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--removed">
            from {executableText[oldMode]} <code>{oldMode}</code>
          </span>
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--added">
            to {executableText[newMode]} <code>{newMode}</code>
          </span>
        </Fragment>
      </FilePatchMetaView>
    );
  }

  renderSymlinkChangeMeta() {
    if (!this.props.filePatch.hasSymlink()) {
      return null;
    }

    let detail = <div />;
    let title = '';
    const oldSymlink = this.props.filePatch.getOldSymlink();
    const newSymlink = this.props.filePatch.getNewSymlink();
    if (oldSymlink && newSymlink) {
      detail = (
        <Fragment>
          Symlink changed
          <span className={cx(
            'github-FilePatchView-metaDiff',
            'github-FilePatchView-metaDiff--fullWidth',
            'github-FilePatchView-metaDiff--removed',
          )}>
            from <code>{oldSymlink}</code>
          </span>
          <span className={cx(
            'github-FilePatchView-metaDiff',
            'github-FilePatchView-metaDiff--fullWidth',
            'github-FilePatchView-metaDiff--added',
          )}>
            to <code>{newSymlink}</code>
          </span>.
        </Fragment>
      );
      title = 'Symlink changed';
    } else if (oldSymlink && !newSymlink) {
      detail = (
        <Fragment>
          Symlink
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--removed">
            to <code>{oldSymlink}</code>
          </span>
          deleted.
        </Fragment>
      );
      title = 'Symlink deleted';
    } else if (!oldSymlink && newSymlink) {
      detail = (
        <Fragment>
          Symlink
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--added">
            to <code>{newSymlink}</code>
          </span>
          created.
        </Fragment>
      );
      title = 'Symlink created';
    } else {
      return null;
    }

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        actionIcon: 'icon-move-down',
        actionText: 'Stage Symlink Change',
      }
      : {
        actionIcon: 'icon-move-up',
        actionText: 'Unstage Symlink Change',
      };

    return (
      <FilePatchMetaView
        title={title}
        actionIcon={attrs.actionIcon}
        actionText={attrs.actionText}
        action={this.props.toggleSymlinkChange}>
        <Fragment>
          {detail}
        </Fragment>
      </FilePatchMetaView>
    );
  }

  renderHunkHeaders() {
    const selectedHunks = this.state.selectedHunks;
    const isHunkSelectionMode = this.props.selection.getMode() === 'hunk';
    const toggleVerb = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage';

    return (
      <Fragment>
        {/*
          The markers on this layer are used to efficiently locate Hunks based on buffer row.
          See .getHunkAt().
        */}
        <MarkerLayer handleLayer={this.hunkMarkerLayerHolder.setter}>
          {this.props.filePatch.getHunks().map((hunk, index) => {
            return (
              <Marker
                key={`hunkSpan-${index}`}
                bufferRange={hunk.getBufferRange()}
                invalidate="never"
                handleID={id => { this.hunksByMarkerID.set(id, hunk); }}
              />
            );
          })}
        </MarkerLayer>
        {/*
          These markers are decorated to position hunk headers as block decorations.
        */}
        <MarkerLayer>
          {this.props.filePatch.getHunks().map((hunk, index) => {
            const isSelected = selectedHunks.has(hunk);
            let buttonSuffix = (isHunkSelectionMode || !isSelected) ? ' Hunk' : ' Selection';
            if (isSelected && selectedHunks.size > 1) {
              buttonSuffix += 's';
            }
            const toggleSelectionLabel = `${toggleVerb}${buttonSuffix}`;
            const discardSelectionLabel = `Discard${buttonSuffix}`;

            const startPoint = hunk.getBufferRange().start;
            const startRange = new Range(startPoint, startPoint);

            return (
              <Marker key={`hunkHeader-${index}`} bufferRange={startRange} invalidate="never">
                <Decoration type="block">
                  <HunkHeaderView
                    hunk={hunk}
                    isSelected={isSelected}
                    stagingStatus={this.props.stagingStatus}
                    selectionMode={this.props.selection.getMode()}
                    toggleSelectionLabel={toggleSelectionLabel}
                    discardSelectionLabel={discardSelectionLabel}

                    tooltips={this.props.tooltips}

                    toggleSelection={() => this.toggleSelection(hunk)}
                    discardSelection={() => this.discardSelection(hunk)}
                    mouseDown={this.props.mouseDownOnHeader}
                  />
                </Decoration>
              </Marker>
            );
          })}
        </MarkerLayer>
      </Fragment>
    );
  }

  renderLineDecorations(ranges, lineClass, {line, gutter}) {
    if (ranges.length === 0) {
      return null;
    }

    return (
      <MarkerLayer>
        {ranges.map((range, index) => {
          return (
            <Marker
              key={`line-${lineClass}-${index}`}
              bufferRange={range}
              invalidate="never"
            />
          );
        })}

        {line && <Decoration type="line" className={lineClass} omitEmptyLastRow={false} />}
        {gutter && (
          <Fragment>
            <Decoration
              type="line-number"
              gutterName="old-line-numbers"
              className={lineClass}
              omitEmptyLastRow={false}
            />
            <Decoration
              type="line-number"
              gutterName="new-line-numbers"
              className={lineClass}
              omitEmptyLastRow={false}
            />
          </Fragment>
        )}
      </MarkerLayer>
    );
  }

  didMouseDownOnLineNumber(event) {
    const line = event.bufferRow;
    const hunk = this.getHunkAt(event.bufferRow);
    if (hunk === undefined) {
      return;
    }

    this.props.mouseDownOnLineNumber(event.domEvent, hunk, line);
  }

  didMouseMoveOnLineNumber(event) {
    const line = event.bufferRow;
    if (this.lastMouseMoveLine === line || line === undefined) {
      return;
    }
    this.lastMouseMoveLine = line;

    const hunk = this.getHunkAt(event.bufferRow);
    if (hunk === undefined) {
      return;
    }

    this.props.mouseMoveOnLineNumber(event.domEvent, hunk, line);
  }

  didMouseUp() {
    this.props.mouseUp();
  }

  oldLineNumberLabel({bufferRow, softWrapped}) {
    const hunk = this.getHunkAt(bufferRow);
    if (hunk === undefined) {
      return this.pad('');
    }

    const oldRow = hunk.getOldRowAt(bufferRow);
    if (softWrapped) {
      return this.pad(oldRow === null ? '' : '•');
    }

    return this.pad(oldRow);
  }

  newLineNumberLabel({bufferRow, softWrapped}) {
    const hunk = this.getHunkAt(bufferRow);
    if (hunk === undefined) {
      return '';
    }

    const newRow = hunk.getNewRowAt(bufferRow);
    if (softWrapped) {
      return this.pad(newRow === null ? '' : '•');
    }
    return this.pad(newRow);
  }

  toggleSelection(hunk) {
    if (this.state.selectedHunks.has(hunk)) {
      return this.props.toggleLines(this.state.selectedLines);
    } else {
      return this.props.selectAndToggleHunk(hunk);
    }
  }

  discardSelection(hunk) {
    if (this.state.selectedHunks.has(hunk)) {
      return this.props.discardLines(this.state.selectedLines);
    } else {
      return this.props.selectAndDiscardHunk(hunk);
    }
  }

  getHunkAt(bufferRow) {
    const hunkFromMarker = this.hunkMarkerLayerHolder.map(layer => {
      const markers = layer.findMarkers({intersectsRow: bufferRow});
      if (markers.length === 0) {
        return null;
      }
      return this.hunksByMarkerID.get(markers[0].id);
    }).getOr(null);

    if (hunkFromMarker !== null) {
      return hunkFromMarker;
    }

    // Fall back to a linear hunk scan.
    for (const hunk of this.props.filePatch.getHunks()) {
      if (hunk.includesBufferRow(bufferRow)) {
        return hunk;
      }
    }

    // Hunk not found.
    return undefined;
  }

  pad(num) {
    const maxDigits = this.props.filePatch.getMaxLineNumberWidth();
    if (num === null) {
      return NBSP_CHARACTER.repeat(maxDigits);
    } else {
      return NBSP_CHARACTER.repeat(maxDigits - num.toString().length) + num.toString();
    }
  }

}
