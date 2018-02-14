import path from 'path';

import React from 'react';
import PropTypes from 'prop-types';

import {Point} from 'atom';
import {Emitter, CompositeDisposable} from 'event-kit';
import {autobind} from 'core-decorators';

import Switchboard from '../switchboard';
import FilePatchView from '../views/file-patch-view';
import ModelObserver from '../models/model-observer';

export default class FilePatchController extends React.Component {
  static propTypes = {
    largeDiffLineThreshold: PropTypes.number,
    getRepositoryForWorkdir: PropTypes.func.isRequired,
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
      filePatch: null,
      stagingStatus: props.initialStagingStatus,
      isPartiallyStaged: false,
    };

    this.repositoryObserver = new ModelObserver({
      didUpdate: repo => this.onRepoRefresh(repo),
    });
    this.repositoryObserver.setActiveModel(props.getRepositoryForWorkdir(this.props.workingDirectoryPath));

    this.filePatchLoadedPromise = new Promise(res => {
      this.resolveFilePatchLoadedPromise = res;
    });

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      this.props.switchboard.onDidFinishActiveContextUpdate(() => {
        this.repositoryObserver.setActiveModel(this.props.getRepositoryForWorkdir(this.props.workingDirectoryPath));
      }),
    );
  }

  getFilePatchLoadedPromise() {
    return this.filePatchLoadedPromise;
  }

  getStagingStatus() {
    return this.state.stagingStatus;
  }

  getFilePath() {
    return this.props.filePath;
  }

  getWorkingDirectory() {
    return this.props.workingDirectoryPath;
  }

  getTitle() {
    let title = this.isStaged() ? 'Staged' : 'Unstaged';
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
  async onRepoRefresh(repository) {
    const staged = this.isStaged();
    let filePatch = await this.getFilePatchForPath(this.props.filePath, staged);
    const isPartiallyStaged = await repository.isPartiallyStaged(this.props.filePath);
    if (filePatch) {
      this.resolveFilePatchLoadedPromise();
      if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
    } else {
      const oldFilePatch = this.state.filePatch;
      if (oldFilePatch) {
        filePatch = oldFilePatch.clone({
          oldFile: oldFilePatch.oldFile.clone({mode: null, symlink: null}),
          newFile: oldFilePatch.newFile.clone({mode: null, symlink: null}),
          patch: oldFilePatch.getPatch().clone({hunks: []}),
        });
        if (!this.destroyed) { this.setState({filePatch, isPartiallyStaged}); }
      }
    }
  }

  getFilePatchForPath(filePath, staged) {
    const repository = this.repositoryObserver.getActiveModel();
    const amending = staged && this.isAmending();
    return repository.getFilePatchForPath(filePath, {staged, amending});
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
    const fp = this.state.filePatch;
    const hunks = fp ? fp.getHunks() : [];
    const executableModeChange = fp && fp.didChangeExecutableMode() ?
      {oldMode: fp.getOldMode(), newMode: fp.getNewMode()} :
      null;
    const symlinkChange = fp && fp.hasSymlink() ?
    {
      oldSymlink: fp.getOldSymlink(),
      newSymlink: fp.getNewSymlink(),
      typechange: fp.hasTypechange(),
      filePatchStatus: fp.getStatus(),
    } : null;
    const repository = this.repositoryObserver.getActiveModel();
    if (repository.isUndetermined() || repository.isLoading()) {
      return (
        <div className="github-PaneView pane-item is-blank github-Loader">
          <span className="github-Spinner" />
        </div>
      );
    } else if (repository.isAbsent()) {
      return (
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">
            The repository for {this.props.workingDirectoryPath} is not open in Atom.
          </span>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      const hasUndoHistory = repository ? this.hasUndoHistory() : false;
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            ref={c => { this.filePatchView = c; }}
            commandRegistry={this.props.commandRegistry}
            tooltips={this.props.tooltips}
            displayLargeDiffMessage={!this.shouldDisplayLargeDiff(this.state.filePatch)}
            lineCount={this.lineCount}
            handleShowDiffClick={this.handleShowDiffClick}
            hunks={hunks}
            executableModeChange={executableModeChange}
            symlinkChange={symlinkChange}
            filePath={this.props.filePath}
            workingDirectoryPath={this.getWorkingDirectory()}
            stagingStatus={this.state.stagingStatus}
            isPartiallyStaged={this.state.isPartiallyStaged}
            attemptLineStageOperation={this.attemptLineStageOperation}
            attemptHunkStageOperation={this.attemptHunkStageOperation}
            attemptFileStageOperation={this.attemptFileStageOperation}
            attemptModeStageOperation={this.attemptModeStageOperation}
            attemptSymlinkStageOperation={this.attemptSymlinkStageOperation}
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
    if (!filePatch) { return true; }

    const fullPath = path.join(this.getWorkingDirectory(), this.props.filePath);
    if (FilePatchController.confirmedLargeFilePatches.has(fullPath)) {
      return true;
    }

    const lineCount = filePatch.getHunks().reduce((acc, hunk) => hunk.getLines().length, 0);
    this.lineCount = lineCount;
    return lineCount < this.props.largeDiffLineThreshold;
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  @autobind
  handleShowDiffClick() {
    if (this.repositoryObserver.getActiveModel()) {
      const fullPath = path.join(this.getWorkingDirectory(), this.props.filePath);
      FilePatchController.confirmedLargeFilePatches.add(fullPath);
      this.forceUpdate();
    }
  }

  async stageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({stage: true, hunk: true});

    await this.repositoryObserver.getActiveModel().applyPatchToIndex(
      this.state.filePatch.getStagePatchForHunk(hunk),
    );
    this.props.switchboard.didFinishStageOperation({stage: true, hunk: true});
  }

  async unstageHunk(hunk) {
    this.props.switchboard.didBeginStageOperation({unstage: true, hunk: true});

    await this.repositoryObserver.getActiveModel().applyPatchToIndex(
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

  async stageFile() {
    this.props.switchboard.didBeginStageOperation({stage: true, file: true});

    await this.repositoryObserver.getActiveModel().stageFiles([this.props.filePath]);
    this.props.switchboard.didFinishStageOperation({stage: true, file: true});
  }

  async unstageFile() {
    this.props.switchboard.didBeginStageOperation({unstage: true, file: true});

    await this.repositoryObserver.getActiveModel().unstageFiles([this.props.filePath]);

    this.props.switchboard.didFinishStageOperation({unstage: true, file: true});
  }

  stageOrUnstageFile() {
    const stagingStatus = this.state.stagingStatus;
    if (stagingStatus === 'unstaged') {
      return this.stageFile();
    } else if (stagingStatus === 'staged') {
      return this.unstageFile();
    } else {
      throw new Error(`Unknown stagingStatus: ${stagingStatus}`);
    }
  }

  async stageModeChange(mode) {
    this.props.switchboard.didBeginStageOperation({stage: true, mode: true});

    await this.repositoryObserver.getActiveModel().stageFileModeChange(
      this.props.filePath, mode,
    );
    this.props.switchboard.didFinishStageOperation({stage: true, mode: true});
  }

  async unstageModeChange(mode) {
    this.props.switchboard.didBeginStageOperation({unstage: true, mode: true});

    await this.repositoryObserver.getActiveModel().stageFileModeChange(
      this.props.filePath, mode,
    );
    this.props.switchboard.didFinishStageOperation({unstage: true, mode: true});
  }

  stageOrUnstageModeChange() {
    const stagingStatus = this.state.stagingStatus;
    const oldMode = this.state.filePatch.getOldMode();
    const newMode = this.state.filePatch.getNewMode();
    if (stagingStatus === 'unstaged') {
      return this.stageModeChange(newMode);
    } else if (stagingStatus === 'staged') {
      return this.unstageModeChange(oldMode);
    } else {
      throw new Error(`Unknown stagingStatus: ${stagingStatus}`);
    }
  }

  async stageSymlinkChange() {
    this.props.switchboard.didBeginStageOperation({stage: true, symlink: true});

    const filePatch = this.state.filePatch;
    if (filePatch.hasTypechange() && filePatch.getStatus() === 'added') {
      await this.repositoryObserver.getActiveModel().stageFileSymlinkChange(this.props.filePath);
    } else {
      await this.repositoryObserver.getActiveModel().stageFiles([this.props.filePath]);
    }
    this.props.switchboard.didFinishStageOperation({stage: true, symlink: true});
  }

  async unstageSymlinkChange() {
    this.props.switchboard.didBeginStageOperation({unstage: true, symlink: true});

    const filePatch = this.state.filePatch;
    if (filePatch.hasTypechange() && filePatch.getStatus() === 'deleted') {
      await this.repositoryObserver.getActiveModel().stageFileSymlinkChange(this.props.filePath);
    } else {
      await this.repositoryObserver.getActiveModel().unstageFiles([this.props.filePath]);
    }
    this.props.switchboard.didFinishStageOperation({unstage: true, symlink: true});
  }

  stageOrUnstageSymlinkChange() {
    const stagingStatus = this.state.stagingStatus;
    if (stagingStatus === 'unstaged') {
      return this.stageSymlinkChange();
    } else if (stagingStatus === 'staged') {
      return this.unstageSymlinkChange();
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

  @autobind
  attemptFileStageOperation() {
    if (this.stagingOperationInProgress) {
      return;
    }

    this.stagingOperationInProgress = true;
    this.props.switchboard.getChangePatchPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageFile();
  }

  @autobind
  attemptModeStageOperation() {
    if (this.stagingOperationInProgress) {
      return;
    }

    this.stagingOperationInProgress = true;
    this.props.switchboard.getChangePatchPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageModeChange();
  }

  @autobind
  attemptSymlinkStageOperation() {
    if (this.stagingOperationInProgress) {
      return;
    }

    this.stagingOperationInProgress = true;
    this.props.switchboard.getChangePatchPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageSymlinkChange();
  }

  async stageLines(lines) {
    this.props.switchboard.didBeginStageOperation({stage: true, line: true});

    await this.repositoryObserver.getActiveModel().applyPatchToIndex(
      this.state.filePatch.getStagePatchForLines(lines),
    );

    this.props.switchboard.didFinishStageOperation({stage: true, line: true});
  }

  async unstageLines(lines) {
    this.props.switchboard.didBeginStageOperation({unstage: true, line: true});

    await this.repositoryObserver.getActiveModel().applyPatchToIndex(
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
    const stagingStatus = this.isStaged() ? 'unstaged' : 'staged';
    const filePatch = await this.getFilePatchForPath(this.props.filePath, stagingStatus === 'staged');
    this.props.quietlySelectItem(this.props.filePath, stagingStatus);
    this.setState({filePatch, stagingStatus});
  }

  isAmending() {
    return this.repositoryObserver.getActiveModel().isAmending();
  }

  isStaged() {
    return this.state.stagingStatus === 'staged';
  }

  isEmpty() {
    return !this.state.filePatch || this.state.filePatch.getHunks().length === 0;
  }

  @autobind
  focus() {
    if (this.filePatchView) {
      this.filePatchView.focus();
    }
  }

  wasActivated(isStillActive) {
    process.nextTick(() => {
      isStillActive() && this.focus();
    });
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
  discardLines(lines) {
    return this.props.discardLines(this.state.filePatch, lines, this.repositoryObserver.getActiveModel());
  }

  @autobind
  undoLastDiscard() {
    return this.props.undoLastDiscard(this.props.filePath, this.repositoryObserver.getActiveModel());
  }

  @autobind
  hasUndoHistory() {
    return this.repositoryObserver.getActiveModel().hasDiscardHistory(this.props.filePath);
  }

  destroy() {
    this.destroyed = true;
    this.subscriptions.dispose();
    this.repositoryObserver.destroy();
    this.emitter.emit('did-destroy');
  }
}
