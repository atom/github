import React from 'react';

import {Point} from 'atom';
import {Emitter} from 'event-kit';
import {autobind} from 'core-decorators';

import EventWatcher from '../event-watcher';
import FilePatchView from '../views/file-patch-view';

export default class FilePatchController extends React.Component {
  static propTypes = {
    repository: React.PropTypes.object,
    commandRegistry: React.PropTypes.object.isRequired,
    filePatch: React.PropTypes.object.isRequired,
    stagingStatus: React.PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    isPartiallyStaged: React.PropTypes.bool.isRequired,
    isAmending: React.PropTypes.bool.isRequired,
    discardLines: React.PropTypes.func.isRequired,
    didSurfaceFile: React.PropTypes.func.isRequired,
    didDiveIntoFilePath: React.PropTypes.func.isRequired,
    quietlySelectItem: React.PropTypes.func.isRequired,
    undoLastDiscard: React.PropTypes.func.isRequired,
    openFiles: React.PropTypes.func.isRequired,
    eventWatcher: React.PropTypes.instanceOf(EventWatcher),
  }

  static defaultProps = {
    eventWatcher: new EventWatcher(),
  }

  constructor(props, context) {
    super(props, context);

    this.stagingOperationInProgress = false;
    this.emitter = new Emitter();
  }

  serialize() {
    return null;
  }

  componentWillReceiveProps(nextProps) {
    if (this.getTitle(nextProps) !== this.getTitle()) {
      this.emitter.emit('did-change-title', this.getTitle(nextProps));
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
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      const filePath = this.props.filePatch.getPath();
      const hasUndoHistory = this.props.repository ? this.hasUndoHistory() : false;
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            commandRegistry={this.props.commandRegistry}
            hunks={hunks}
            filePath={filePath}
            stagingStatus={this.props.stagingStatus}
            isPartiallyStaged={this.props.isPartiallyStaged}
            attemptLineStageOperation={this.attemptLineStageOperation}
            attemptHunkStageOperation={this.attemptHunkStageOperation}
            didSurfaceFile={this.didSurfaceFile}
            didDiveIntoCorrespondingFilePatch={this.diveIntoCorrespondingFilePatch}
            eventWatcher={this.props.eventWatcher}
            openCurrentFile={this.openCurrentFile}
            discardLines={this.props.discardLines}
            undoLastDiscard={this.undoLastDiscard}
            hasUndoHistory={hasUndoHistory}
          />
        </div>
      );
    }
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  async stageHunk(hunk) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForHunk(hunk),
    );
    this.props.eventWatcher.resolveStageOperationPromise();
  }

  async unstageHunk(hunk) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForHunk(hunk),
    );
    this.props.eventWatcher.resolveStageOperationPromise();
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
    this.props.eventWatcher.getPatchChangedPromise().then(() => {
      this.stagingOperationInProgress = false;
    });

    this.stageOrUnstageHunk(hunk);
  }

  async stageLines(lines) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForLines(lines),
    );

    this.props.eventWatcher.resolveStageOperationPromise();
  }

  async unstageLines(lines) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForLines(lines),
    );

    this.props.eventWatcher.resolveStageOperationPromise();
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
    this.props.eventWatcher.getPatchChangedPromise().then(() => {
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
    if (this.refs.filePatchView) {
      this.refs.filePatchView.focus();
    }
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

  destroy() {
    this.emitter.emit('did-destroy');
  }
}
