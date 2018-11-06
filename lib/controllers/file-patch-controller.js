import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

import {autobind, equalSets} from '../helpers';
import {addEvent} from '../reporter-proxy';
import {MultiFilePatchPropType} from '../prop-types';
import ChangedFileItem from '../items/changed-file-item';
import FilePatchView from '../views/file-patch-view';

export default class FilePatchController extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    multiFilePatch: MultiFilePatchPropType.isRequired,
    hasUndoHistory: PropTypes.bool,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
    discardLines: PropTypes.func,
    undoLastDiscard: PropTypes.func,
    surfaceFileAtPath: PropTypes.func,
    handleClick: PropTypes.func,
  }

  constructor(props) {
    super(props);
    autobind(
      this,
      'selectedRowsChanged',
      'undoLastDiscard', 'diveIntoMirrorPatch', 'surfaceFile', 'openFile',
      'toggleFile', 'toggleRows', 'toggleModeChange', 'toggleSymlinkChange', 'discardRows',
    );

    this.state = {
      lastMultiFilePatch: this.props.multiFilePatch,
      selectionMode: 'hunk',
      selectedRows: new Set(),
    };

    this.mouseSelectionInProgress = false;
    this.stagingOperationInProgress = false;

    this.patchChangePromise = new Promise(resolve => {
      this.resolvePatchChangePromise = resolve;
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.multiFilePatch !== this.props.multiFilePatch) {
      this.resolvePatchChangePromise();
      this.patchChangePromise = new Promise(resolve => {
        this.resolvePatchChangePromise = resolve;
      });
    }
  }

  render() {
    return (
      <FilePatchView
        {...this.props}

        selectedRows={this.state.selectedRows}
        selectionMode={this.state.selectionMode}
        selectedRowsChanged={this.selectedRowsChanged}

        diveIntoMirrorPatch={this.diveIntoMirrorPatch}
        surfaceFile={this.surfaceFile}
        openFile={this.openFile}
        toggleFile={this.toggleFile}
        toggleRows={this.toggleRows}
        toggleModeChange={this.toggleModeChange}
        toggleSymlinkChange={this.toggleSymlinkChange}
        undoLastDiscard={this.undoLastDiscard}
        discardRows={this.discardRows}
        selectNextHunk={this.selectNextHunk}
        selectPreviousHunk={this.selectPreviousHunk}
      />
    );
  }

  undoLastDiscard(filePatch, {eventSource} = {}) {
    addEvent('undo-last-discard', {
      package: 'github',
      component: 'FilePatchController',
      eventSource,
    });

    return this.props.undoLastDiscard(filePatch.getPath(), this.props.repository);
  }

  diveIntoMirrorPatch(filePatch) {
    const mirrorStatus = this.withStagingStatus({staged: 'unstaged', unstaged: 'staged'});
    const workingDirectory = this.props.repository.getWorkingDirectoryPath();
    const uri = ChangedFileItem.buildURI(filePatch.getPath(), workingDirectory, mirrorStatus);

    this.props.destroy();
    return this.props.workspace.open(uri);
  }

  surfaceFile(filePatch) {
    return this.props.surfaceFileAtPath(filePatch.getPath(), this.props.stagingStatus);
  }

  async openFile(filePatch, positions) {
    const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), filePatch.getPath());
    const editor = await this.props.workspace.open(absolutePath, {pending: true});
    if (positions.length > 0) {
      editor.setCursorBufferPosition(positions[0], {autoscroll: false});
      for (const position of positions.slice(1)) {
        editor.addCursorAtBufferPosition(position);
      }
      editor.scrollToBufferPosition(positions[positions.length - 1], {center: true});
    }
    return editor;
  }

  toggleFile(filePatch) {
    return this.stagingOperation(() => {
      const methodName = this.withStagingStatus({staged: 'unstageFiles', unstaged: 'stageFiles'});
      return this.props.repository[methodName]([filePatch.getPath()]);
    });
  }

  async toggleRows(rowSet, nextSelectionMode) {
    let chosenRows = rowSet;
    if (chosenRows) {
      await this.selectedRowsChanged(chosenRows, nextSelectionMode);
    } else {
      chosenRows = this.state.selectedRows;
    }

    if (chosenRows.size === 0) {
      return Promise.resolve();
    }

    return this.stagingOperation(() => {
      const patch = this.withStagingStatus({
        staged: () => this.props.multiFilePatch.getUnstagePatchForLines(chosenRows),
        unstaged: () => this.props.multiFilePatch.getStagePatchForLines(chosenRows),
      });
      return this.props.repository.applyPatchToIndex(patch);
    });
  }

  toggleModeChange(filePatch) {
    return this.stagingOperation(() => {
      const targetMode = this.withStagingStatus({
        unstaged: filePatch.getNewMode(),
        staged: filePatch.getOldMode(),
      });
      return this.props.repository.stageFileModeChange(filePatch.getPath(), targetMode);
    });
  }

  toggleSymlinkChange(filePatch) {
    return this.stagingOperation(() => {
      const relPath = filePatch.getPath();
      const repository = this.props.repository;
      return this.withStagingStatus({
        unstaged: () => {
          if (filePatch.hasTypechange() && filePatch.getStatus() === 'added') {
            return repository.stageFileSymlinkChange(relPath);
          }

          return repository.stageFiles([relPath]);
        },
        staged: () => {
          if (filePatch.hasTypechange() && filePatch.getStatus() === 'deleted') {
            return repository.stageFileSymlinkChange(relPath);
          }

          return repository.unstageFiles([relPath]);
        },
      });
    });
  }

  async discardRows(rowSet, nextSelectionMode, {eventSource} = {}) {
    let chosenRows = rowSet;
    if (chosenRows) {
      await this.selectedRowsChanged(chosenRows, nextSelectionMode);
    } else {
      chosenRows = this.state.selectedRows;
    }

    addEvent('discard-unstaged-changes', {
      package: 'github',
      component: 'FilePatchController',
      lineCount: chosenRows.size,
      eventSource,
    });

    return this.props.discardLines(this.props.multiFilePatch, chosenRows, this.props.repository);
  }

  selectedRowsChanged(rows, nextSelectionMode) {
    if (equalSets(this.state.selectedRows, rows) && this.state.selectionMode === nextSelectionMode) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.setState({selectedRows: rows, selectionMode: nextSelectionMode}, resolve);
    });
  }

  withStagingStatus(callbacks) {
    const callback = callbacks[this.props.stagingStatus];
    /* istanbul ignore if */
    if (!callback) {
      throw new Error(`Unknown staging status: ${this.props.stagingStatus}`);
    }
    return callback instanceof Function ? callback() : callback;
  }

  stagingOperation(fn) {
    if (this.stagingOperationInProgress) {
      return null;
    }
    this.stagingOperationInProgress = true;
    this.patchChangePromise.then(() => {
      this.stagingOperationInProgress = false;
    });

    return fn();
  }
}
