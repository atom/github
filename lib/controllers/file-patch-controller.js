import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';

import {Point} from 'atom';
import {Emitter} from 'event-kit';
import {autobind} from 'core-decorators';

import Switchboard from '../switchboard';
import FilePatchView from '../views/file-patch-view';

export default class FilePatchController extends React.Component {
  static propTypes = {
    largeDiffLineThreshold: PropTypes.number,
    activeWorkingDirectory: PropTypes.string,
    repository: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    filePatch: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    isAmending: PropTypes.bool.isRequired,
    discardLines: PropTypes.func.isRequired,
    didSurfaceFile: PropTypes.func.isRequired,
    didDiveIntoFilePath: PropTypes.func.isRequired,
    quietlySelectItem: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
    switchboard: PropTypes.instanceOf(Switchboard),
  }

  static defaultProps = {
    largeDiffLineThreshold: 1000,
    switchboard: new Switchboard(),
  }

  static confirmedLargeFilePatches = new Set()

  static resetConfirmedLargeFilePatches() {
    this.confirmedLargeFilePatches = new Set();
  }

  constructor(props, context) {
    super(props, context);

    this.stagingOperationInProgress = false;
    this.emitter = new Emitter();
  }

  serialize() {
    return null;
  }

  componentDidUpdate(prevProps) {
    if (this.getTitle(prevProps) !== this.getTitle()) {
      this.emitter.emit('did-change-title');
    }
  }

  render() {
    const hunks = this.props.filePatch.getHunks();
    if (!hunks.length) {
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">File has no contents</span>
        </div>
      );
    } else if (!this.shouldDisplayLargeDiff(this.props.filePatch)) {
      return (
        <div className="github-PaneView pane-item large-file-patch">
          <p>This is a large diff. For performance reasons, it is not rendered by default.</p>
          <button className="btn btn-primary" onClick={this.handleShowDiffClick}>Show Diff</button>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      const filePath = this.props.filePatch.getPath();
      const hasUndoHistory = this.props.repository ? this.hasUndoHistory() : false;
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            ref={c => { this.filePatchView = c; }}
            commandRegistry={this.props.commandRegistry}
            hunks={hunks}
            filePath={filePath}
            stagingStatus={this.props.stagingStatus}
            isPartiallyStaged={this.props.isPartiallyStaged}
            attemptLineStageOperation={this.attemptLineStageOperation}
            attemptHunkStageOperation={this.attemptHunkStageOperation}
            didSurfaceFile={this.didSurfaceFile}
            didDiveIntoCorrespondingFilePatch={this.diveIntoCorrespondingFilePatch}
            switchboard={this.props.switchboard}
            openCurrentFile={this.openCurrentFile}
            discardLines={this.props.discardLines}
            undoLastDiscard={this.undoLastDiscard}
            hasUndoHistory={hasUndoHistory}
          />
        </div>
      );
    }
  }

  shouldDisplayLargeDiff(filePatch) {
    const fullPath = path.join(this.props.repository.getWorkingDirectoryPath(), this.props.filePatch.getPath());
    if (FilePatchController.confirmedLargeFilePatches.has(fullPath)) {
      return true;
    }

    const lineCount = filePatch.getHunks().reduce((acc, hunk) => hunk.getLines().length, 0);
    return lineCount < this.props.largeDiffLineThreshold;
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  @autobind
  handleShowDiffClick() {
    if (this.props.repository) {
      const fullPath = path.join(this.props.repository.getWorkingDirectoryPath(), this.props.filePatch.getPath());
      FilePatchController.confirmedLargeFilePatches.add(fullPath);
      this.forceUpdate();
    }
  }

  async stageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({stage: true, hunk: true});

    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForHunk(hunk),
    );
    this.props.switchboard.didFinishStageOperation({stage: true, hunk: true});
  }

  async unstageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({unstage: true, hunk: true});

    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForHunk(hunk),
    );

    this.props.switchboard.didFinishStageOperation({unstage: true, hunk: true});
  }

  stageOrUnstageHunk(hunk) {
    if (this.props.stagingStatus === 'unstaged') {
      return this.stageHunk(hunk);
    } else if (this.props.stagingStatus === 'staged') {
      return this.unstageHunk(hunk);
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`);
    }
  }

  @autobind
  attemptHunkStageOperation(hunk) {
    if (this.stagingOperationInProgress) {
      return;
    }

    this.stagingOperationInProgress = true;
    this.props.switchboard.getChangePatchPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageHunk(hunk);
  }

  async stageLines(lines) {
    this.props.switchboard.didBeginStageOperation({stage: true, line: true});

    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({stage: true, line: true});
  }

  async unstageLines(lines) {
    this.props.switchboard.didBeginStageOperation({unstage: true, line: true});

    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({unstage: true, line: true});
  }

  stageOrUnstageLines(lines) {
    if (this.props.stagingStatus === 'unstaged') {
      return this.stageLines(lines);
    } else if (this.props.stagingStatus === 'staged') {
      return this.unstageLines(lines);
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`);
    }
  }

  @autobind
  attemptLineStageOperation(lines) {
    if (this.stagingOperationInProgress) {
      return;
    }

    this.stagingOperationInProgress = true;
    this.props.switchboard.getChangePatchPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageLines(lines);
  }

  getTitle(props = this.props) {
    let title = props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += props.filePatch.getPath();
    return title;
  }

  @autobind
  didSurfaceFile() {
    if (this.props.didSurfaceFile) {
      this.props.didSurfaceFile(this.props.filePatch.getPath(), this.props.stagingStatus);
    }
  }

  @autobind
  diveIntoCorrespondingFilePatch() {
    const filePath = this.props.filePatch.getPath();
    const stagingStatus = this.props.stagingStatus === 'staged' ? 'unstaged' : 'staged';
    this.props.quietlySelectItem(filePath, stagingStatus);
    return this.props.didDiveIntoFilePath(filePath, stagingStatus, {amending: this.props.isAmending});
  }

  focus() {
    if (this.filePatchView) {
      this.filePatchView.focus();
    }
  }

  wasActivated() {
    process.nextTick(() => this.focus());
  }

  @autobind
  async openCurrentFile({lineNumber} = {}) {
    const [textEditor] = await this.props.openFiles([this.props.filePatch.getPath()]);
    const position = new Point(lineNumber ? lineNumber - 1 : 0, 0);
    textEditor.scrollToBufferPosition(position, {center: true});
    textEditor.setCursorBufferPosition(position);
    return textEditor;
  }

  @autobind
  undoLastDiscard() {
    return this.props.undoLastDiscard(this.props.filePatch.getPath());
  }

  @autobind
  hasUndoHistory() {
    return this.props.repository.hasDiscardHistory(this.props.filePatch.getPath());
  }

  /**
   * Used to detect the context when this PaneItem is active
   */
  getWorkingDirectory() {
    return this.props.activeWorkingDirectory;
  }

  destroy() {
    this.emitter.emit('did-destroy');
  }
}
