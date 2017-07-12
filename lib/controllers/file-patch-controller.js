import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';

import {Point} from 'atom';
import {Emitter} from 'event-kit';
import {autobind} from 'core-decorators';

import Switchboard from '../switchboard';
import FilePatchView from '../views/file-patch-view';
import ModelObserver from '../models/model-observer';
import FilePatch from '../models/file-patch';
import FilePatchPaneItem from '../atom-items/file-patch-pane-item';

export default class FilePatchController extends React.Component {
  static propTypes = {
    largeDiffLineThreshold: PropTypes.number,
    repository: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    filePatch: PropTypes.object.isRequired,
    workingDirectoryPath: PropTypes.string.isRequired,
    lineNumber: PropTypes.number,
    stagingStatus: PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    isAmending: PropTypes.bool.isRequired,
    discardLines: PropTypes.func.isRequired,
    didSurfaceFile: PropTypes.func.isRequired,
    quietlySelectItem: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
    getSelectedStagingViewItems: PropTypes.func.isRequired,
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

    this.state = {
      filePatch: props.filePatch,
      stagingStatus: props.stagingStatus,
      isAmending: props.isAmending,
      isPartiallyStaged: props.isPartiallyStaged,
    };

    this.repository = props.repository;
    this.workingDirectoryPath = props.repository.getWorkingDirectoryPath();
    this.repositoryObserver = new ModelObserver({
      didUpdate: () => this.onRepoRefresh(),
    });
    this.repositoryObserver.setActiveModel(props.repository);
  }

  serialize() {
    return null;
  }

  @autobind
  async onRepoRefresh() {
    const filePath = this.state.filePatch.getPath();
    const repository = this.repository;
    const staged = this.state.stagingStatus === 'staged';
    const isPartiallyStaged = await repository.isPartiallyStaged(filePath);
    let filePatch = await repository.getFilePatchForPath(filePath, {staged, amending: staged && this.state.isAmending});
    if (filePatch) {
      if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
    } else {
      const pendingItems = atom.workspace.getCenter().getPanes().map(p => p.getPendingItem())
        .filter(item => item instanceof FilePatchPaneItem && item.component === this);
      if (pendingItems.length === 0) {
        const oldFilePatch = this.state.filePatch;
        filePatch = new FilePatch(oldFilePatch.getOldPath(), oldFilePatch.getNewPath(), oldFilePatch.getStatus(), []);
        if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.getTitle(prevProps) !== this.getTitle()) {
      this.emitter.emit('did-change-title');
    }
  }

  componentDidMount() {
    if (this.props.lineNumber) {
      this.filePatchView.goToDiffLine(this.props.lineNumber);
    }
  }

  componentWillUnmount() {
    this.destroy();
  }

  render() {
    const hunks = this.state.filePatch.getHunks();
    if (!hunks.length) {
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">File has no contents</span>
        </div>
      );
    } else if (!this.shouldDisplayLargeDiff(this.state.filePatch)) {
      return (
        <div className="github-PaneView pane-item large-file-patch">
          <p>This is a large diff. For performance reasons, it is not rendered by default.</p>
          <button className="btn btn-primary" onClick={this.handleShowDiffClick}>Show Diff</button>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      const filePath = this.state.filePatch.getPath();
      const hasUndoHistory = this.repository ? this.hasUndoHistory() : false;
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            ref={c => { this.filePatchView = c; }}
            commandRegistry={this.props.commandRegistry}
            tooltips={this.props.tooltips}
            hunks={hunks}
            filePath={filePath}
            filePatch={this.state.filePatch}
            workingDirectoryPath={this.props.workingDirectoryPath}
            stagingStatus={this.state.stagingStatus}
            isPartiallyStaged={this.state.isPartiallyStaged}
            getSelectedStagingViewItems={this.props.getSelectedStagingViewItems}
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

  async setAmendingState(isAmending) {
    const filePath = this.state.filePatch.getPath();
    const staged = this.state.stagingStatus === 'staged';
    const amending = staged && isAmending;
    const filePatch = await this.repository.getFilePatchForPath(filePath, {staged, amending});
    if (filePatch) { this.setState({filePatch, isAmending}); }
  }

  shouldDisplayLargeDiff(filePatch) {
    const fullPath = path.join(this.repository.getWorkingDirectoryPath(), this.state.filePatch.getPath());
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
    if (this.repository) {
      const fullPath = path.join(this.repository.getWorkingDirectoryPath(), this.state.filePatch.getPath());
      FilePatchController.confirmedLargeFilePatches.add(fullPath);
      this.forceUpdate();
    }
  }

  async stageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({stage: true, hunk: true});

    await this.repository.applyPatchToIndex(
      this.state.filePatch.getStagePatchForHunk(hunk),
    );
    this.props.switchboard.didFinishStageOperation({stage: true, hunk: true});
  }

  async unstageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({unstage: true, hunk: true});

    await this.repository.applyPatchToIndex(
      this.state.filePatch.getUnstagePatchForHunk(hunk),
    );

    this.props.switchboard.didFinishStageOperation({unstage: true, hunk: true});
  }

  stageOrUnstageHunk(hunk) {
    const stagingStatus = this.state.stagingStatus;
    if (stagingStatus === 'unstaged') {
      return this.stageHunk(hunk);
    } else if (stagingStatus === 'staged') {
      return this.unstageHunk(hunk);
    } else {
      throw new Error(`Unknown stagingStatus: ${stagingStatus}`);
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

    await this.repository.applyPatchToIndex(
      this.state.filePatch.getStagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({stage: true, line: true});
  }

  async unstageLines(lines) {
    this.props.switchboard.didBeginStageOperation({unstage: true, line: true});

    await this.repository.applyPatchToIndex(
      this.state.filePatch.getUnstagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({unstage: true, line: true});
  }

  stageOrUnstageLines(lines) {
    const stagingStatus = this.state.stagingStatus;
    if (stagingStatus === 'unstaged') {
      return this.stageLines(lines);
    } else if (stagingStatus === 'staged') {
      return this.unstageLines(lines);
    } else {
      throw new Error(`Unknown stagingStatus: ${stagingStatus}`);
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

  getTitle() {
    let title = this.state.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += this.state.filePatch.getPath();
    return title;
  }

  @autobind
  didSurfaceFile() {
    if (this.props.didSurfaceFile) {
      this.props.didSurfaceFile(this.state.filePatch.getPath(), this.state.stagingStatus);
    }
  }

  @autobind
  async diveIntoCorrespondingFilePatch() {
    const filePath = this.state.filePatch.getPath();
    const stagingStatus = this.state.stagingStatus === 'staged' ? 'unstaged' : 'staged';
    const staged = stagingStatus === 'staged';
    const amending = staged && this.state.isAmending;
    const filePatch = await this.repository.getFilePatchForPath(filePath, {staged, amending});
    this.props.quietlySelectItem(filePath, stagingStatus);
    this.setState({filePatch, stagingStatus});
  }

  @autobind
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
    const [textEditor] = await this.props.openFiles([this.state.filePatch.getPath()]);
    const position = new Point(lineNumber ? lineNumber - 1 : 0, 0);
    textEditor.scrollToBufferPosition(position, {center: true});
    textEditor.setCursorBufferPosition(position);
    return textEditor;
  }

  @autobind
  undoLastDiscard() {
    return this.props.undoLastDiscard(this.state.filePatch.getPath());
  }

  @autobind
  hasUndoHistory() {
    return this.repository.hasDiscardHistory(this.state.filePatch.getPath());
  }

  destroy() {
    this.destroyed = true;
    this.emitter.emit('did-destroy');
    this.repositoryObserver.destroy();
  }
}
