import React from 'react';
import PropTypes from 'prop-types';
import path from 'path';

import {autobind, equalSets} from '../helpers';
import FilePatchItem from '../items/file-patch-item';
import FilePatchView from '../views/file-patch-view';

export default class FilePatchController extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    relPath: PropTypes.string.isRequired,
    filePatch: PropTypes.object.isRequired,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
    discardLines: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(
      this,
      'selectedRangesChanged',
      'undoLastDiscard', 'diveIntoMirrorPatch', 'openFile',
      'toggleFile', 'toggleHunk', 'toggleLines', 'toggleModeChange', 'toggleSymlinkChange',
      'discardLines', 'discardHunk',
    );

    this.state = {
      lastFilePatch: this.props.filePatch,
      selectedRows: new Set(),
    };

    this.mouseSelectionInProgress = false;
    this.stagingOperationInProgress = false;

    this.patchChangePromise = new Promise(resolve => {
      this.resolvePatchChangePromise = resolve;
    });
  }

  static getDerivedStateFromProps(props, state) {
    if (props.filePatch !== state.lastFilePatch) {
      return {
        selectedRows: new Set(), // FIXME
        lastFilePatch: props.filePatch,
      };
    }

    return null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.filePatch !== this.props.filePatch) {
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
        selectedRangesChanged={this.selectedRangesChanged}

        diveIntoMirrorPatch={this.diveIntoMirrorPatch}
        openFile={this.openFile}
        toggleFile={this.toggleFile}
        toggleHunk={this.toggleHunk}
        toggleLines={this.toggleLines}
        toggleModeChange={this.toggleModeChange}
        toggleSymlinkChange={this.toggleSymlinkChange}
        undoLastDiscard={this.undoLastDiscard}
        discardLines={this.discardLines}
        discardHunk={this.discardHunk}
        selectNextHunk={this.selectNextHunk}
        selectPreviousHunk={this.selectPreviousHunk}
      />
    );
  }

  undoLastDiscard() {
    return this.props.undoLastDiscard(this.props.relPath, this.props.repository);
  }

  async diveIntoMirrorPatch() {
    const mirrorStatus = this.withStagingStatus({staged: 'unstaged', unstaged: 'staged'});
    const workingDirectory = this.props.repository.getWorkingDirectoryPath();
    const uri = FilePatchItem.buildURI(this.props.relPath, workingDirectory, mirrorStatus);

    this.props.destroy();
    await this.props.workspace.open(uri);
  }

  async openFile(positions) {
    const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), this.props.relPath);
    const editor = await this.props.workspace.open(absolutePath, {pending: true});
    if (positions.length > 0) {
      editor.setCursorBufferPosition(positions[0], {autoscroll: false});
      for (const position of positions.slice(1)) {
        editor.addCursorAtBufferPosition(position);
      }
      editor.scrollToBufferPosition(positions[positions.length - 1], {center: true});
    }
  }

  toggleFile() {
    return this.stagingOperation(() => {
      const methodName = this.withStagingStatus({staged: 'unstageFiles', unstaged: 'stageFiles'});
      return this.props.repository[methodName]([this.props.relPath]);
    });
  }

  toggleHunk(hunk) {
    return this.stagingOperation(() => {
      const patch = this.withStagingStatus({
        staged: () => this.props.filePatch.getUnstagePatchForHunk(hunk),
        unstaged: () => this.props.filePatch.getStagePatchForHunk(hunk),
      });
      return this.props.repository.applyPatchToIndex(patch);
    });
  }

  toggleLines(lines) {
    return this.stagingOperation(() => {
      const patch = this.withStagingStatus({
        staged: () => this.props.filePatch.getUnstagePatchForLines(lines),
        unstaged: () => this.props.filePatch.getStagePatchForLines(lines),
      });
      return this.props.repository.applyPatchToIndex(patch);
    });
  }

  toggleModeChange() {
    return this.stagingOperation(() => {
      const targetMode = this.withStagingStatus({
        unstaged: this.props.filePatch.getNewMode(),
        staged: this.props.filePatch.getOldMode(),
      });
      return this.props.repository.stageFileModeChange(this.props.relPath, targetMode);
    });
  }

  toggleSymlinkChange() {
    return this.stagingOperation(() => {
      const {filePatch, relPath, repository} = this.props;
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

  discardLines(lines) {
    return this.props.discardLines(this.props.filePatch, lines, this.props.repository);
  }

  discardHunk(hunk) {
    return this.discardLines(hunk.getLines());
  }

  selectedRangesChanged(ranges) {
    const newSelectedRows = new Set();
    for (const range of ranges) {
      for (let row = range.start.row; row <= range.end.row; row++) {
        newSelectedRows.add(row);
      }
    }

    if (equalSets(this.state.selectedRows, newSelectedRows)) {
      return;
    }

    this.setState({selectedRows: newSelectedRows});
  }

  withStagingStatus(callbacks) {
    const callback = callbacks[this.props.stagingStatus];
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
