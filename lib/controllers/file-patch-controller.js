import React from 'react';
import PropTypes from 'prop-types';
import {Point} from 'atom';
import path from 'path';

import {autobind} from '../helpers';
import FilePatchSelection from '../models/file-patch-selection';
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
      'mouseDownOnHeader', 'mouseDownOnLineNumber', 'mouseMoveOnLineNumber', 'mouseUp',
      'undoLastDiscard', 'diveIntoMirrorPatch', 'openFile',
      'toggleFile', 'selectAndToggleHunk', 'toggleLines', 'toggleModeChange', 'toggleSymlinkChange',
      'discardLines', 'selectAndDiscardHunk',
      'selectNextHunk', 'selectPreviousHunk', 'togglePatchSelectionMode',
    );

    this.state = {
      lastFilePatch: this.props.filePatch,
      selection: new FilePatchSelection(this.props.filePatch.getHunks()),
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
        selection: state.selection.updateHunks(props.filePatch.getHunks()),
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

        selection={this.state.selection}

        mouseDownOnHeader={this.mouseDownOnHeader}
        mouseDownOnLineNumber={this.mouseDownOnLineNumber}
        mouseMoveOnLineNumber={this.mouseMoveOnLineNumber}
        mouseUp={this.mouseUp}

        diveIntoMirrorPatch={this.diveIntoMirrorPatch}
        openFile={this.openFile}
        toggleFile={this.toggleFile}
        selectAndToggleHunk={this.selectAndToggleHunk}
        toggleLines={this.toggleLines}
        toggleModeChange={this.toggleModeChange}
        toggleSymlinkChange={this.toggleSymlinkChange}
        undoLastDiscard={this.undoLastDiscard}
        discardLines={this.discardLines}
        selectAndDiscardHunk={this.selectAndDiscardHunk}
        selectNextHunk={this.selectNextHunk}
        selectPreviousHunk={this.selectPreviousHunk}
        togglePatchSelectionMode={this.togglePatchSelectionMode}
      />
    );
  }

  mouseDownOnHeader(event, hunk) {
    if (event.button !== 0) { return; }
    const windows = process.platform === 'win32';
    if (event.ctrlKey && !windows) { return; } // simply open context menu

    this.mouseSelectionInProgress = true;
    event.persist && event.persist();

    this.setState(prevState => {
      let selection = prevState.selection;
      if (event.metaKey || (event.ctrlKey && windows)) {
        if (selection.getMode() === 'hunk') {
          selection = selection.addOrSubtractHunkSelection(hunk);
        } else {
          // TODO: optimize
          selection = hunk.getLines().reduce(
            (current, line) => current.addOrSubtractLineSelection(line).coalesce(),
            selection,
          );
        }
      } else if (event.shiftKey) {
        if (selection.getMode() === 'hunk') {
          selection = selection.selectHunk(hunk, true);
        } else {
          const hunkLines = hunk.getLines();
          const tailIndex = selection.getLineSelectionTailIndex();
          const selectedHunkAfterTail = tailIndex < hunkLines[0].diffLineNumber;
          if (selectedHunkAfterTail) {
            selection = selection.selectLine(hunkLines[hunkLines.length - 1], true);
          } else {
            selection = selection.selectLine(hunkLines[0], true);
          }
        }
      } else {
        selection = selection.selectHunk(hunk, false);
      }

      return {selection};
    });
  }

  mouseDownOnLineNumber(event, hunk, line) {
    if (event.button !== 0) { return; }
    const windows = process.platform === 'win32';
    if (event.ctrlKey && !windows) { return; } // simply open context menu

    this.mouseSelectionInProgress = true;
    event.persist && event.persist();

    this.setState(prevState => {
      let selection = prevState.selection;

      if (event.metaKey || (event.ctrlKey && windows)) {
        if (selection.getMode() === 'hunk') {
          selection = selection.addOrSubtractHunkSelection(hunk);
        } else {
          selection = selection.addOrSubtractLineSelection(line);
        }
      } else if (event.shiftKey) {
        if (selection.getMode() === 'hunk') {
          selection = selection.selectHunk(hunk, true);
        } else {
          selection = selection.selectLine(line, true);
        }
      } else if (event.detail === 1) {
        selection = selection.selectLine(line, false);
      } else if (event.detail === 2) {
        selection = selection.selectHunk(hunk, false);
      }

      return {selection};
    });
  }

  mouseMoveOnLineNumber(event, hunk, line) {
    if (!this.mouseSelectionInProgress) { return; }

    this.setState(prevState => {
      let selection = null;
      if (prevState.selection.getMode() === 'hunk') {
        selection = prevState.selection.selectHunk(hunk, true);
      } else {
        selection = prevState.selection.selectLine(line, true);
      }
      return {selection};
    });
  }

  mouseUp() {
    this.mouseSelectionInProgress = false;
    this.setState(prevState => {
      return {selection: prevState.selection.coalesce()};
    });
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

  async openFile(lineNumber = null) {
    const absolutePath = path.join(this.props.repository.getWorkingDirectoryPath(), this.props.relPath);
    const editor = await this.props.workspace.open(absolutePath, {pending: true});
    const position = new Point(lineNumber ? lineNumber - 1 : 0, 0);
    editor.scrollToBufferPosition(position, {center: true});
    editor.setCursorBufferPosition(position);
  }

  toggleFile() {
    return this.stagingOperation(() => {
      const methodName = this.withStagingStatus({staged: 'unstageFiles', unstaged: 'stageFiles'});
      return this.props.repository[methodName]([this.props.relPath]);
    });
  }

  async selectAndToggleHunk(hunk) {
    await this.selectHunk(hunk);

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

  async selectAndDiscardHunk(hunk) {
    await this.selectHunk(hunk);
    return this.discardLines(hunk.getLines());
  }

  selectHunk(hunk) {
    return new Promise(resolve => {
      this.setState(prevState => ({selection: prevState.selection.selectHunk(hunk)}), resolve);
    });
  }

  selectNextHunk() {
    return new Promise(resolve => {
      this.setState(prevState => ({selection: prevState.selection.selectNextHunk()}), resolve);
    });
  }

  selectPreviousHunk() {
    return new Promise(resolve => {
      this.setState(prevState => ({selection: prevState.selection.selectPreviousHunk()}), resolve);
    });
  }

  togglePatchSelectionMode() {
    return new Promise(resolve => {
      this.setState(prevState => ({selection: prevState.selection.toggleMode()}), resolve);
    });
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
