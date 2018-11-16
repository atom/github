import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {Range} from 'atom';
import {CompositeDisposable} from 'event-kit';

import {autobind} from '../helpers';
import {RefHolderPropType, MultiFilePatchPropType} from '../prop-types';
import AtomTextEditor from '../atom/atom-text-editor';
import Marker from '../atom/marker';
import MarkerLayer from '../atom/marker-layer';
import Decoration from '../atom/decoration';
import Gutter from '../atom/gutter';
import Commands, {Command} from '../atom/commands';
import FilePatchHeaderView from './file-patch-header-view';
import FilePatchMetaView from './file-patch-meta-view';
import HunkHeaderView from './hunk-header-view';
import RefHolder from '../models/ref-holder';
import ChangedFileItem from '../items/changed-file-item';
import CommitPreviewItem from '../items/commit-preview-item';
import File from '../models/patch/file';

const executableText = {
  [File.modes.NORMAL]: 'non executable',
  [File.modes.EXECUTABLE]: 'executable',
};

const NBSP_CHARACTER = '\u00a0';

const BLANK_LABEL = () => NBSP_CHARACTER;

export default class MultiFilePatchView extends React.Component {
  static propTypes = {
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']).isRequired,
    isPartiallyStaged: PropTypes.bool,
    multiFilePatch: MultiFilePatchPropType.isRequired,
    selectionMode: PropTypes.oneOf(['hunk', 'line']).isRequired,
    selectedRows: PropTypes.object.isRequired,
    hasMultipleFileSelections: PropTypes.bool.isRequired,
    repository: PropTypes.object.isRequired,
    hasUndoHistory: PropTypes.bool,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    selectedRowsChanged: PropTypes.func.isRequired,

    diveIntoMirrorPatch: PropTypes.func.isRequired,
    surface: PropTypes.func.isRequired,
    openFile: PropTypes.func.isRequired,
    toggleFile: PropTypes.func.isRequired,
    toggleRows: PropTypes.func.isRequired,
    toggleModeChange: PropTypes.func.isRequired,
    toggleSymlinkChange: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    discardRows: PropTypes.func.isRequired,

    refInitialFocus: RefHolderPropType,
    itemType: PropTypes.oneOf([ChangedFileItem, CommitPreviewItem]).isRequired,
  }

  constructor(props) {
    super(props);
    autobind(
      this,
      'didMouseDownOnHeader', 'didMouseDownOnLineNumber', 'didMouseMoveOnLineNumber', 'didMouseUp',
      'didConfirm', 'didToggleSelectionMode', 'selectNextHunk', 'selectPreviousHunk',
      'didOpenFile', 'didAddSelection', 'didChangeSelectionRange', 'didDestroySelection',
      'oldLineNumberLabel', 'newLineNumberLabel',
    );

    this.mouseSelectionInProgress = false;
    this.lastMouseMoveLine = null;
    this.nextSelectionMode = null;
    this.suppressChanges = false;
    this.refRoot = new RefHolder();
    this.refEditor = new RefHolder();
    this.refEditorElement = new RefHolder();

    this.subs = new CompositeDisposable();

    this.subs.add(
      this.refEditor.observe(editor => {
        this.refEditorElement.setter(editor.getElement());
      }),
      this.refEditorElement.observe(element => {
        this.props.refInitialFocus && this.props.refInitialFocus.setter(element);
      }),
    );
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.didMouseUp);
    this.refEditor.map(editor => {
      // this.props.multiFilePatch is guaranteed to contain at least one FilePatch if <AtomTextEditor> is rendered.
      const [firstPatch] = this.props.multiFilePatch.getFilePatches();
      const [firstHunk] = firstPatch.getHunks();
      if (!firstHunk) {
        return null;
      }

      this.nextSelectionMode = 'hunk';
      editor.setSelectedBufferRange(firstHunk.getRange());
      return null;
    });

    this.subs.add(
      this.props.config.onDidChange('github.showDiffIconGutter', ({newValue}) => this.forceUpdate()),
    );
  }

  getSnapshotBeforeUpdate(prevProps) {
    let newSelectionRange = null;
    if (this.props.multiFilePatch.toString() !== prevProps.multiFilePatch.toString()) {
      // Heuristically adjust the editor selection based on the old file patch, the old row selection state, and
      // the incoming patch.
      newSelectionRange = this.props.multiFilePatch.getNextSelectionRange(
        prevProps.multiFilePatch,
        prevProps.selectedRows,
      );

      this.suppressChanges = true;
      this.props.multiFilePatch.adoptBufferFrom(prevProps.multiFilePatch);
      this.suppressChanges = false;
    }
    return newSelectionRange;
  }

  componentDidUpdate(prevProps, prevState, newSelectionRange) {
    if (prevProps.refInitialFocus !== this.props.refInitialFocus) {
      prevProps.refInitialFocus && prevProps.refInitialFocus.setter(null);
      this.props.refInitialFocus && this.refEditorElement.map(this.props.refInitialFocus.setter);
    }

    if (newSelectionRange) {
      this.refEditor.map(editor => {
        if (this.props.selectionMode === 'line') {
          this.nextSelectionMode = 'line';
          editor.setSelectedBufferRange(newSelectionRange);
        } else {
          const nextHunks = new Set(
            Range.fromObject(newSelectionRange).getRows()
              .map(row => this.props.multiFilePatch.getHunkAt(row))
              .filter(Boolean),
          );
          const nextRanges = nextHunks.size > 0
            ? Array.from(nextHunks, hunk => hunk.getRange())
            : [[[0, 0], [0, 0]]];

          this.nextSelectionMode = 'hunk';
          editor.setSelectedBufferRanges(nextRanges);
        }

        return null;
      });
    } else {
      this.nextSelectionMode = null;
    }
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.didMouseUp);
    this.subs.dispose();
  }

  render() {
    const rootClass = cx(
      'github-FilePatchView',
      `github-FilePatchView--${this.props.stagingStatus}`,
      {'github-FilePatchView--blank': !this.props.multiFilePatch.anyPresent()},
      {'github-FilePatchView--hunkMode': this.props.selectionMode === 'hunk'},
    );

    return (
      <div className={rootClass} ref={this.refRoot.setter}>
        {this.renderCommands()}

        <main className="github-FilePatchView-container">
          {this.props.multiFilePatch.anyPresent() ? this.renderNonEmptyPatch() : this.renderEmptyPatch()}
        </main>
      </div>
    );
  }

  renderCommands() {
    let stageModeCommand = null;
    let stageSymlinkCommand = null;

    if (this.props.multiFilePatch.didAnyChangeExecutableMode()) {
      const command = this.props.stagingStatus === 'unstaged'
        ? 'github:stage-file-mode-change'
        : 'github:unstage-file-mode-change';
      stageModeCommand = <Command command={command} callback={this.didToggleModeChange} />;
    }

    if (this.props.multiFilePatch.anyHaveTypechange()) {
      const command = this.props.stagingStatus === 'unstaged'
        ? 'github:stage-symlink-change'
        : 'github:unstage-symlink-change';
      stageSymlinkCommand = <Command command={command} callback={this.didToggleSymlinkChange} />;
    }

    return (
      <Commands registry={this.props.commands} target={this.refRoot}>
        <Command command="core:confirm" callback={this.didConfirm} />
        <Command command="core:undo" callback={this.undoLastDiscardFromCoreUndo} />
        <Command command="github:discard-selected-lines" callback={this.discardSelectionFromCommand} />
        <Command command="github:select-next-hunk" callback={this.selectNextHunk} />
        <Command command="github:select-previous-hunk" callback={this.selectPreviousHunk} />
        <Command command="github:jump-to-file" callback={this.didOpenFile} />
        <Command command="github:surface" callback={this.props.surface} />
        <Command command="github:toggle-patch-selection-mode" callback={this.didToggleSelectionMode} />
        {stageModeCommand}
        {stageSymlinkCommand}
      </Commands>
    );
  }

  renderEmptyPatch() {
    return <p className="github-FilePatchView-message icon icon-info">No changes to display</p>;
  }

  renderNonEmptyPatch() {
    return (
      <AtomTextEditor
        workspace={this.props.workspace}

        buffer={this.props.multiFilePatch.getBuffer()}
        lineNumberGutterVisible={false}
        autoWidth={false}
        autoHeight={false}
        readOnly={true}
        softWrapped={true}

        didAddSelection={this.didAddSelection}
        didChangeSelectionRange={this.didChangeSelectionRange}
        didDestroySelection={this.didDestroySelection}
        refModel={this.refEditor}>

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
        {this.props.config.get('github.showDiffIconGutter') && (
          <Gutter
            name="diff-icons"
            priority={3}
            type="line-number"
            className="icons"
            labelFn={BLANK_LABEL}
            onMouseDown={this.didMouseDownOnLineNumber}
            onMouseMove={this.didMouseMoveOnLineNumber}
          />
        )}

        {this.props.multiFilePatch.getFilePatches().map(this.renderFilePatchDecorations)}

        {this.renderLineDecorations(
          Array.from(this.props.selectedRows, row => Range.fromObject([[row, 0], [row, Infinity]])),
          'github-FilePatchView-line--selected',
          {gutter: true, icon: true, line: true},
        )}

        {this.renderDecorationsOnLayer(
          this.props.multiFilePatch.getAdditionLayer(),
          'github-FilePatchView-line--added',
          {icon: true, line: true},
        )}
        {this.renderDecorationsOnLayer(
          this.props.multiFilePatch.getDeletionLayer(),
          'github-FilePatchView-line--deleted',
          {icon: true, line: true},
        )}
        {this.renderDecorationsOnLayer(
          this.props.multiFilePatch.getNoNewlineLayer(),
          'github-FilePatchView-line--nonewline',
          {icon: true, line: true},
        )}

      </AtomTextEditor>
    );
  }

  renderFilePatchDecorations = filePatch => {
    return (
      <Fragment key={filePatch.getPath()}>
        <Marker invalidate="never" bufferRange={filePatch.getStartRange()}>
          <Decoration type="block" className="github-FilePatchView-controlBlock">
            <FilePatchHeaderView
              itemType={this.props.itemType}
              relPath={filePatch.getPath()}
              stagingStatus={this.props.stagingStatus}
              isPartiallyStaged={this.props.isPartiallyStaged}
              hasHunks={filePatch.getHunks().length > 0}
              hasUndoHistory={this.props.hasUndoHistory}
              hasMultipleFileSelections={this.props.hasMultipleFileSelections}

              tooltips={this.props.tooltips}

              undoLastDiscard={() => this.undoLastDiscardFromButton(filePatch)}
              diveIntoMirrorPatch={() => this.props.diveIntoMirrorPatch(filePatch)}
              openFile={() => this.didOpenFile({selectedFilePatch: filePatch})}
              toggleFile={() => this.props.toggleFile(filePatch)}
            />
            {this.renderSymlinkChangeMeta(filePatch)}
            {this.renderExecutableModeChangeMeta(filePatch)}
          </Decoration>
        </Marker>

        {this.renderHunkHeaders(filePatch)}
      </Fragment>
    );
  }

  renderExecutableModeChangeMeta(filePatch) {
    if (!filePatch.didChangeExecutableMode()) {
      return null;
    }

    const oldMode = filePatch.getOldMode();
    const newMode = filePatch.getNewMode();

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
        action={() => this.props.toggleModeChange(filePatch)}>
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

  renderSymlinkChangeMeta(filePatch) {
    if (!filePatch.hasSymlink()) {
      return null;
    }

    let detail = <div />;
    let title = '';
    const oldSymlink = filePatch.getOldSymlink();
    const newSymlink = filePatch.getNewSymlink();
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
    } else {
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
        action={() => this.props.toggleSymlinkChange(filePatch)}>
        <Fragment>
          {detail}
        </Fragment>
      </FilePatchMetaView>
    );
  }

  renderHunkHeaders(filePatch) {
    const toggleVerb = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage';
    const selectedHunks = new Set(
      Array.from(this.props.selectedRows, row => this.props.multiFilePatch.getHunkAt(row)),
    );

    return (
      <Fragment>
        <MarkerLayer>
          {filePatch.getHunks().map((hunk, index) => {
            const containsSelection = this.props.selectionMode === 'line' && selectedHunks.has(hunk);
            const isSelected = (this.props.selectionMode === 'hunk') && selectedHunks.has(hunk);

            let buttonSuffix = '';
            if (containsSelection) {
              buttonSuffix += 'Selected Line';
              if (this.props.selectedRows.size > 1) {
                buttonSuffix += 's';
              }
            } else {
              buttonSuffix += 'Hunk';
              if (selectedHunks.size > 1) {
                buttonSuffix += 's';
              }
            }

            const toggleSelectionLabel = `${toggleVerb} ${buttonSuffix}`;
            const discardSelectionLabel = `Discard ${buttonSuffix}`;

            const startPoint = hunk.getRange().start;
            const startRange = new Range(startPoint, startPoint);

            return (
              <Marker key={`hunkHeader-${index}`} bufferRange={startRange} invalidate="never">
                <Decoration type="block" className="github-FilePatchView-controlBlock">
                  <HunkHeaderView
                    refTarget={this.refEditorElement}
                    hunk={hunk}
                    isSelected={isSelected}
                    stagingStatus={this.props.stagingStatus}
                    selectionMode="line"
                    toggleSelectionLabel={toggleSelectionLabel}
                    discardSelectionLabel={discardSelectionLabel}

                    tooltips={this.props.tooltips}
                    keymaps={this.props.keymaps}

                    toggleSelection={() => this.toggleHunkSelection(hunk, containsSelection)}
                    discardSelection={() => this.discardHunkSelection(hunk, containsSelection)}
                    mouseDown={this.didMouseDownOnHeader}
                  />
                </Decoration>
              </Marker>
            );
          })}
        </MarkerLayer>
      </Fragment>
    );
  }

  renderLineDecorations(ranges, lineClass, {line, gutter, icon, refHolder}) {
    if (ranges.length === 0) {
      return null;
    }

    const holder = refHolder || new RefHolder();
    return (
      <MarkerLayer handleLayer={holder.setter}>
        {ranges.map((range, index) => {
          return (
            <Marker
              key={`line-${lineClass}-${index}`}
              bufferRange={range}
              invalidate="never"
            />
          );
        })}
        {this.renderDecorations(lineClass, {line, gutter, icon})}
      </MarkerLayer>
    );
  }

  renderDecorationsOnLayer(layer, lineClass, {line, gutter, icon}) {
    if (layer.getMarkerCount() === 0) {
      return null;
    }

    return (
      <MarkerLayer external={layer}>
        {this.renderDecorations(lineClass, {line, gutter, icon})}
      </MarkerLayer>
    );
  }

  renderDecorations(lineClass, {line, gutter, icon}) {
    return (
      <Fragment>
        {line && (
          <Decoration
            type="line"
            className={lineClass}
            omitEmptyLastRow={false}
          />
        )}
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
        {icon && (
          <Decoration
            type="line-number"
            gutterName="diff-icons"
            className={lineClass}
            omitEmptyLastRow={false}
          />
        )}
      </Fragment>
    );
  }

  undoLastDiscardFromCoreUndo = () => {
    if (this.props.hasUndoHistory) {
      this.props.undoLastDiscard({eventSource: {command: 'core:undo'}});
    }
  }

  undoLastDiscardFromButton = filePatch => {
    this.props.undoLastDiscard(filePatch, {eventSource: 'button'});
  }

  discardSelectionFromCommand = () => {
    return this.props.discardRows(
      this.props.selectedRows,
      this.props.selectionMode,
      {eventSource: {command: 'github:discard-selected-lines'}},
    );
  }

  toggleHunkSelection(hunk, containsSelection) {
    if (containsSelection) {
      return this.props.toggleRows(
        this.props.selectedRows,
        this.props.selectionMode,
        {eventSource: 'button'},
      );
    } else {
      const changeRows = new Set(
        hunk.getChanges()
          .reduce((rows, change) => {
            rows.push(...change.getBufferRows());
            return rows;
          }, []),
      );
      return this.props.toggleRows(
        changeRows,
        'hunk',
        {eventSource: 'button'},
      );
    }
  }

  discardHunkSelection(hunk, containsSelection) {
    if (containsSelection) {
      return this.props.discardRows(
        this.props.selectedRows,
        this.props.selectionMode,
        {eventSource: 'button'},
      );
    } else {
      const changeRows = new Set(
        hunk.getChanges()
          .reduce((rows, change) => {
            rows.push(...change.getBufferRows());
            return rows;
          }, []),
      );
      return this.props.discardRows(changeRows, 'hunk', {eventSource: 'button'});
    }
  }

  didMouseDownOnHeader(event, hunk) {
    this.nextSelectionMode = 'hunk';
    this.handleSelectionEvent(event, hunk.getRange());
  }

  didMouseDownOnLineNumber(event) {
    const line = event.bufferRow;
    if (line === undefined || isNaN(line)) {
      return;
    }

    this.nextSelectionMode = 'line';
    if (this.handleSelectionEvent(event.domEvent, [[line, 0], [line, Infinity]])) {
      this.mouseSelectionInProgress = true;
    }
  }

  didMouseMoveOnLineNumber(event) {
    if (!this.mouseSelectionInProgress) {
      return;
    }

    const line = event.bufferRow;
    if (this.lastMouseMoveLine === line || line === undefined || isNaN(line)) {
      return;
    }
    this.lastMouseMoveLine = line;

    this.nextSelectionMode = 'line';
    this.handleSelectionEvent(event.domEvent, [[line, 0], [line, Infinity]], {add: true});
  }

  didMouseUp() {
    this.mouseSelectionInProgress = false;
  }

  handleSelectionEvent(event, rangeLike, opts) {
    if (event.button !== 0) {
      return false;
    }

    const isWindows = process.platform === 'win32';
    if (event.ctrlKey && !isWindows) {
      // Allow the context menu to open.
      return false;
    }

    const options = {
      add: false,
      ...opts,
    };

    // Normalize the target selection range
    const converted = Range.fromObject(rangeLike);
    const range = this.refEditor.map(editor => editor.clipBufferRange(converted)).getOr(converted);

    if (event.metaKey || /* istanbul ignore next */ (event.ctrlKey && isWindows)) {
      this.refEditor.map(editor => {
        let intersects = false;
        let without = null;

        for (const selection of editor.getSelections()) {
          if (selection.intersectsBufferRange(range)) {
            // Remove range from this selection by truncating it to the "near edge" of the range and creating a
            // new selection from the "far edge" to the previous end. Omit either side if it is empty.
            intersects = true;
            const selectionRange = selection.getBufferRange();

            const newRanges = [];

            if (!range.start.isEqual(selectionRange.start)) {
              // Include the bit from the selection's previous start to the range's start.
              let nudged = range.start;
              if (range.start.column === 0) {
                const lastColumn = editor.getBuffer().lineLengthForRow(range.start.row - 1);
                nudged = [range.start.row - 1, lastColumn];
              }

              newRanges.push([selectionRange.start, nudged]);
            }

            if (!range.end.isEqual(selectionRange.end)) {
              // Include the bit from the range's end to the selection's end.
              let nudged = range.end;
              const lastColumn = editor.getBuffer().lineLengthForRow(range.end.row);
              if (range.end.column === lastColumn) {
                nudged = [range.end.row + 1, 0];
              }

              newRanges.push([nudged, selectionRange.end]);
            }

            if (newRanges.length > 0) {
              selection.setBufferRange(newRanges[0]);
              for (const newRange of newRanges.slice(1)) {
                editor.addSelectionForBufferRange(newRange, {reversed: selection.isReversed()});
              }
            } else {
              without = selection;
            }
          }
        }

        if (without !== null) {
          const replacementRanges = editor.getSelections()
            .filter(each => each !== without)
            .map(each => each.getBufferRange());
          if (replacementRanges.length > 0) {
            editor.setSelectedBufferRanges(replacementRanges);
          }
        }

        if (!intersects) {
          // Add this range as a new, distinct selection.
          editor.addSelectionForBufferRange(range);
        }

        return null;
      });
    } else if (options.add || event.shiftKey) {
      // Extend the existing selection to encompass this range.
      this.refEditor.map(editor => {
        const lastSelection = editor.getLastSelection();
        const lastSelectionRange = lastSelection.getBufferRange();

        // You are now entering the wall of ternery operators. This is your last exit before the tollbooth
        const isBefore = range.start.isLessThan(lastSelectionRange.start);
        const farEdge = isBefore ? range.start : range.end;
        const newRange = isBefore ? [farEdge, lastSelectionRange.end] : [lastSelectionRange.start, farEdge];

        lastSelection.setBufferRange(newRange, {reversed: isBefore});
        return null;
      });
    } else {
      this.refEditor.map(editor => editor.setSelectedBufferRange(range));
    }

    return true;
  }

  didConfirm() {
    return this.props.toggleRows(this.props.selectedRows, this.props.selectionMode);
  }

  didToggleSelectionMode() {
    const selectedHunks = this.getSelectedHunks();
    this.withSelectionMode({
      line: () => {
        const hunkRanges = selectedHunks.map(hunk => hunk.getRange());
        this.nextSelectionMode = 'hunk';
        this.refEditor.map(editor => editor.setSelectedBufferRanges(hunkRanges));
      },
      hunk: () => {
        let firstChangeRow = Infinity;
        for (const hunk of selectedHunks) {
          const [firstChange] = hunk.getChanges();
          if (firstChange && (!firstChangeRow || firstChange.getStartBufferRow() < firstChangeRow)) {
            firstChangeRow = firstChange.getStartBufferRow();
          }
        }

        this.nextSelectionMode = 'line';
        this.refEditor.map(editor => {
          editor.setSelectedBufferRanges([[[firstChangeRow, 0], [firstChangeRow, Infinity]]]);
          return null;
        });
      },
    });
  }

  didToggleModeChange = () => {
    return Promise.all(
      Array.from(this.getSelectedFilePatches())
        .filter(fp => fp.didChangeExecutableMode())
        .map(this.props.toggleModeChange),
    );
  }

  didToggleSymlinkChange = () => {
    return Promise.all(
      Array.from(this.getSelectedFilePatches())
        .filter(fp => fp.hasTypechange())
        .map(this.props.toggleSymlinkChange),
    );
  }

  selectNextHunk() {
    this.refEditor.map(editor => {
      const nextHunks = new Set(
        this.withSelectedHunks(hunk => this.getHunkAfter(hunk) || hunk),
      );
      const nextRanges = Array.from(nextHunks, hunk => hunk.getRange());
      this.nextSelectionMode = 'hunk';
      editor.setSelectedBufferRanges(nextRanges);
      return null;
    });
  }

  selectPreviousHunk() {
    this.refEditor.map(editor => {
      const nextHunks = new Set(
        this.withSelectedHunks(hunk => this.getHunkBefore(hunk) || hunk),
      );
      const nextRanges = Array.from(nextHunks, hunk => hunk.getRange());
      this.nextSelectionMode = 'hunk';
      editor.setSelectedBufferRanges(nextRanges);
      return null;
    });
  }

  didOpenFile({selectedFilePatch} = {}) {
    const cursorsByFilePatch = new Map();

    this.refEditor.map(editor => {
      const placedRows = new Set();

      for (const cursor of editor.getCursors()) {
        const cursorRow = cursor.getBufferPosition().row;
        const hunk = this.props.multiFilePatch.getHunkAt(cursorRow);
        const filePatch = this.props.multiFilePatch.getFilePatchAt(cursorRow);
        /* istanbul ignore next */
        if (!hunk) {
          continue;
        }

        let newRow = hunk.getNewRowAt(cursorRow);
        let newColumn = cursor.getBufferPosition().column;
        if (newRow === null) {
          let nearestRow = hunk.getNewStartRow();
          for (const region of hunk.getRegions()) {
            if (!region.includesBufferRow(cursorRow)) {
              region.when({
                unchanged: () => {
                  nearestRow += region.bufferRowCount();
                },
                addition: () => {
                  nearestRow += region.bufferRowCount();
                },
              });
            } else {
              break;
            }
          }

          if (!placedRows.has(nearestRow)) {
            newRow = nearestRow;
            newColumn = 0;
            placedRows.add(nearestRow);
          }
        }

        if (newRow !== null) {
          // Why is this needed? I _think_ everything is in terms of buffer position
          // so there shouldn't be an off-by-one issue
          newRow -= 1;
          const cursors = cursorsByFilePatch.get(filePatch);
          if (!cursors) {
            cursorsByFilePatch.set(filePatch, [[newRow, newColumn]]);
          } else {
            cursors.push([newRow, newColumn]);
          }
        }
      }

      return null;
    });

    const filePatchesWithCursors = new Set(cursorsByFilePatch.keys());
    if (selectedFilePatch && !filePatchesWithCursors.has(selectedFilePatch)) {
      const [firstHunk] = selectedFilePatch.getHunks();
      const cursorRow = firstHunk ? firstHunk.getNewStartRow() - 1 : 0;
      return this.props.openFile(selectedFilePatch, [[cursorRow, 0]], true);
    } else {
      const pending = cursorsByFilePatch.size === 1;
      return Promise.all(Array.from(cursorsByFilePatch, value => {
        const [filePatch, cursors] = value;
        return this.props.openFile(filePatch, cursors, pending);
      }));
    }

  }

  getSelectedRows() {
    return this.refEditor.map(editor => {
      return new Set(
        editor.getSelections()
          .map(selection => selection.getBufferRange())
          .reduce((acc, range) => {
            for (const row of range.getRows()) {
              if (this.isChangeRow(row)) {
                acc.push(row);
              }
            }
            return acc;
          }, []),
      );
    }).getOr(new Set());
  }

  didAddSelection() {
    this.didChangeSelectedRows();
  }

  didChangeSelectionRange(event) {
    if (
      !event ||
      event.oldBufferRange.start.row !== event.newBufferRange.start.row ||
      event.oldBufferRange.end.row !== event.newBufferRange.end.row
    ) {
      this.didChangeSelectedRows();
    }
  }

  didDestroySelection() {
    this.didChangeSelectedRows();
  }

  didChangeSelectedRows() {
    if (this.suppressChanges) {
      return;
    }

    const nextCursorRows = this.refEditor.map(editor => {
      return editor.getCursorBufferPositions().map(position => position.row);
    }).getOr([]);
    const hasMultipleFileSelections = this.props.multiFilePatch.spansMultipleFiles(nextCursorRows);

    this.props.selectedRowsChanged(
      this.getSelectedRows(),
      this.nextSelectionMode || 'line',
      hasMultipleFileSelections,
    );
  }

  oldLineNumberLabel({bufferRow, softWrapped}) {
    const hunk = this.props.multiFilePatch.getHunkAt(bufferRow);
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
    const hunk = this.props.multiFilePatch.getHunkAt(bufferRow);
    if (hunk === undefined) {
      return this.pad('');
    }

    const newRow = hunk.getNewRowAt(bufferRow);
    if (softWrapped) {
      return this.pad(newRow === null ? '' : '•');
    }
    return this.pad(newRow);
  }

  /*
   * Return a Set of the Hunks that include at least one editor selection. The selection need not contain an actual
   * change row.
   */
  getSelectedHunks() {
    return this.withSelectedHunks(each => each);
  }

  withSelectedHunks(callback) {
    return this.refEditor.map(editor => {
      const seen = new Set();
      return editor.getSelectedBufferRanges().reduce((acc, range) => {
        for (const row of range.getRows()) {
          const hunk = this.props.multiFilePatch.getHunkAt(row);
          if (!hunk || seen.has(hunk)) {
            continue;
          }

          seen.add(hunk);
          acc.push(callback(hunk));
        }
        return acc;
      }, []);
    }).getOr([]);
  }

  /*
   * Return a Set of FilePatches that include at least one editor selection. The selection need not contain an actual
   * change row.
   */
  getSelectedFilePatches() {
    return this.refEditor.map(editor => {
      const patches = new Set();
      for (const range of editor.getSelectedBufferRanges()) {
        for (const row of range.getRows()) {
          const patch = this.props.multiFilePatch.getFilePatchAt(row);
          patches.add(patch);
        }
      }
      return patches;
    }).getOr(new Set());
  }

  getHunkBefore(hunk) {
    const prevRow = hunk.getRange().start.row - 1;
    return this.props.multiFilePatch.getHunkAt(prevRow);
  }

  getHunkAfter(hunk) {
    const nextRow = hunk.getRange().end.row + 1;
    return this.props.multiFilePatch.getHunkAt(nextRow);
  }

  isChangeRow(bufferRow) {
    const changeLayers = [this.props.multiFilePatch.getAdditionLayer(), this.props.multiFilePatch.getDeletionLayer()];
    return changeLayers.some(layer => layer.findMarkers({intersectsRow: bufferRow}).length > 0);
  }

  withSelectionMode(callbacks) {
    const callback = callbacks[this.props.selectionMode];
    /* istanbul ignore if */
    if (!callback) {
      throw new Error(`Unknown selection mode: ${this.props.selectionMode}`);
    }
    return callback();
  }

  pad(num) {
    const maxDigits = this.props.multiFilePatch.getMaxLineNumberWidth();
    if (num === null) {
      return NBSP_CHARACTER.repeat(maxDigits);
    } else {
      return NBSP_CHARACTER.repeat(maxDigits - num.toString().length) + num.toString();
    }
  }

}
