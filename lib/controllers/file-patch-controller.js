import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';

import {Point} from 'atom';
import {Emitter, CompositeDisposable} from 'event-kit';
import {autobind} from 'core-decorators';

import Switchboard from '../switchboard';
import FilePatchView from '../views/file-patch-view';
import ModelObserver from '../models/model-observer';
import FilePatch from '../models/file-patch';

export default class FilePatchController extends React.Component {
  static propTypes = {
    largeDiffLineThreshold: PropTypes.number,
    getRepository: PropTypes.func.isRequired,
    workingDirectoryPath: PropTypes.string.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    deserializers: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    filePath: PropTypes.string.isRequired,
    uri: PropTypes.string.isRequired,
    lineNumber: PropTypes.number,
    initialStagingStatus: PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    discardLines: PropTypes.func.isRequired,
    didSurfaceFile: PropTypes.func.isRequired,
    quietlySelectItem: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    openFiles: PropTypes.func.isRequired,
    switchboard: PropTypes.instanceOf(Switchboard),
    repositoryStateRegistry: PropTypes.object.isRequired,
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
      repository: props.getRepository(),
      filePatch: null,
      stagingStatus: props.initialStagingStatus,
      isPartiallyStaged: false,
      amending: props.repositoryStateRegistry.getStateForModel(props.getRepository()).amending,
    };

    this.repositoryObserver = new ModelObserver({
      didUpdate: () => this.onRepoRefresh(),
    });
    this.repositoryObserver.setActiveModel(this.state.repository);

    this.filePatchLoadedPromise = new Promise(res => {
      this.resolveFilePatchLoadedPromise = res;
    });

    this.onRepoRefresh();

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      this.props.switchboard.onDidFinishActiveContextUpdate(() => {
        const repository = this.props.getRepository();
        this.setState({
          repository,
          amending: this.props.repositoryStateRegistry.getStateForModel(repository).amending,
        });
        this.repositoryObserver.setActiveModel(repository);
      }),
      this.props.repositoryStateRegistry.onDidUpdate(async ({model, data}) => {
        if (model === this.state.repository) {
          const filePatch = await this.state.repository.getFilePatchForPath(this.props.filePath, {
            staged: this.state.stagingStatus === 'staged',
            amending: data.amending,
          });
          this.setState({filePatch, amending: data.amending});
        }
      }),
    );
  }

  getFilePatchLoadedPromise() {
    return this.filePatchLoadedPromise;
  }

  getStagingStatus() {
    return this.state.stagingStatus;
  }

  getWorkingDirectory() {
    return this.props.workingDirectoryPath;
  }

  getTitle() {
    let title = this.state.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += this.props.filePath;
    return title;
  }


  getURI() {
    return this.props.uri;
  }

  serialize() {
    return {
      deserializer: 'FilePatchControllerStub',
      uri: this.getURI(),
    };
  }

  copy() {
    return this.props.deserializers.deserialize(this.serialize());
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  terminatePendingState() {
    if (!this.hasTerminatedPendingState) {
      this.emitter.emit('did-terminate-pending-state');
      this.hasTerminatedPendingState = true;
    }
  }

  onDidTerminatePendingState(callback) {
    return this.emitter.on('did-terminate-pending-state', callback);
  }

  @autobind
  async onRepoRefresh() {
    const repository = this.state.repository;
    const staged = this.state.stagingStatus === 'staged';
    const isPartiallyStaged = await repository.isPartiallyStaged(this.props.filePath);
    const amending = staged && this.state.amending;
    let filePatch = await repository.getFilePatchForPath(this.props.filePath, {staged, amending});
    if (filePatch) {
      this.resolveFilePatchLoadedPromise();
      if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
    } else {
      // TODO: Prevent flicker after staging/unstaging
      const oldFilePatch = this.state.filePatch;
      if (oldFilePatch) {
        filePatch = new FilePatch(oldFilePatch.getOldPath(), oldFilePatch.getNewPath(), oldFilePatch.getStatus(), []);
        if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
      }
    }
  }

  componentDidUpdate(_prevProps, prevState) {
    if (prevState.stagingStatus !== this.state.stagingStatus) {
      this.emitter.emit('did-change-title');
    }
  }

  goToDiffLine(lineNumber) {
    this.filePatchView.goToDiffLine(lineNumber);
  }

  componentWillUnmount() {
    this.destroy();
  }

  render() {
    const hunks = this.state.filePatch ? this.state.filePatch.getHunks() : [];
    console.log(this.props.filePath);
    console.log(hunks);
    if (this.state.repository.isUndetermined() || this.state.repository.isLoading()) {
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="github-Spinner" />
        </div>
      );
    } else if (this.state.repository.isAbsent()) {
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">
            The repository for {this.props.workingDirectoryPath} is not open in Atom.
          </span>
        </div>
      );
    } else if (!hunks.length) {
      console.log(hunks.length);
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">File has no contents</span>
        </div>
      );
    } else if (!this.shouldDisplayLargeDiff(this.state.filePatch)) {
      console.log('display large diff message');
      return (
        <div className="github-PaneView pane-item large-file-patch">
          <p>This is a large diff. For performance reasons, it is not rendered by default.</p>
          <button className="btn btn-primary" onClick={this.handleShowDiffClick}>Show Diff</button>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      const hasUndoHistory = this.state.repository ? this.hasUndoHistory() : false;
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            ref={c => { this.filePatchView = c; }}
            commandRegistry={this.props.commandRegistry}
            tooltips={this.props.tooltips}
            hunks={hunks}
            filePath={this.props.filePath}
            filePatch={this.state.filePatch}
            workingDirectoryPath={this.getWorkingDirectory()}
            stagingStatus={this.state.stagingStatus}
            isPartiallyStaged={this.state.isPartiallyStaged}
            attemptLineStageOperation={this.attemptLineStageOperation}
            attemptHunkStageOperation={this.attemptHunkStageOperation}
            didSurfaceFile={this.didSurfaceFile}
            didDiveIntoCorrespondingFilePatch={this.diveIntoCorrespondingFilePatch}
            switchboard={this.props.switchboard}
            openCurrentFile={this.openCurrentFile}
            discardLines={this.discardLines}
            undoLastDiscard={this.undoLastDiscard}
            hasUndoHistory={hasUndoHistory}
            lineNumber={this.props.lineNumber}
          />
        </div>
      );
    }
  }

  shouldDisplayLargeDiff(filePatch) {
    const fullPath = path.join(this.getWorkingDirectory(), this.props.filePath);
    if (FilePatchController.confirmedLargeFilePatches.has(fullPath)) {
      return true;
    }

    const lineCount = filePatch.getHunks().reduce((acc, hunk) => hunk.getLines().length, 0);
    return lineCount < this.props.largeDiffLineThreshold;
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  @autobind
  handleShowDiffClick() {
    if (this.state.repository) {
      const fullPath = path.join(this.getWorkingDirectory(), this.props.filePath);
      FilePatchController.confirmedLargeFilePatches.add(fullPath);
      this.forceUpdate();
    }
  }

  async stageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({stage: true, hunk: true});

    await this.state.repository.applyPatchToIndex(
      this.state.filePatch.getStagePatchForHunk(hunk),
    );
    this.props.switchboard.didFinishStageOperation({stage: true, hunk: true});
  }

  async unstageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({unstage: true, hunk: true});

    await this.state.repository.applyPatchToIndex(
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

    await this.state.repository.applyPatchToIndex(
      this.state.filePatch.getStagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({stage: true, line: true});
  }

  async unstageLines(lines) {
    this.props.switchboard.didBeginStageOperation({unstage: true, line: true});

    await this.state.repository.applyPatchToIndex(
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

  @autobind
  didSurfaceFile() {
    if (this.props.didSurfaceFile) {
      this.props.didSurfaceFile(this.props.filePath, this.state.stagingStatus);
    }
  }

  @autobind
  async diveIntoCorrespondingFilePatch() {
    const stagingStatus = this.state.stagingStatus === 'staged' ? 'unstaged' : 'staged';
    const staged = stagingStatus === 'staged';
    const amending = staged && this.state.amending;
    const filePatch = await this.state.repository.getFilePatchForPath(this.props.filePath, {staged, amending});
    this.props.quietlySelectItem(this.props.filePath, stagingStatus);
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
    const [textEditor] = await this.props.openFiles([this.props.filePath]);
    const position = new Point(lineNumber ? lineNumber - 1 : 0, 0);
    textEditor.scrollToBufferPosition(position, {center: true});
    textEditor.setCursorBufferPosition(position);
    return textEditor;
  }

  @autobind
  discardLines(filePatch, lines) {
    return this.props.discardLines(filePatch, lines, this.state.repository);
  }

  @autobind
  undoLastDiscard() {
    return this.props.undoLastDiscard(this.props.filePath, this.state.repository);
  }

  @autobind
  hasUndoHistory() {
    return this.state.repository.hasDiscardHistory(this.props.filePath);
  }

  destroy() {
    this.destroyed = true;
    this.subscriptions.dispose();
    this.repositoryObserver.destroy();
    this.emitter.emit('did-destroy');
  }
}
