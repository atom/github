/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {Emitter} from 'atom';
import etch from 'etch';

import FilePatchView from '../views/file-patch-view';

export default class FilePatchController {
  constructor(props) {
    this.props = props;
    this.emitter = new Emitter();
    this.stagingOperationInProgress = false;

    this.stageOrUnstageHunk = this.stageOrUnstageHunk.bind(this);
    this.attemptLineStageOperation = this.attemptLineStageOperation.bind(this);

    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    this.emitter.emit('did-change-title', this.getTitle());
    return etch.update(this);
  }

  destroy() {
    this.emitter.emit('did-destroy');
    return etch.destroy(this);
  }

  render() {
    const hunks = this.props.filePatch.getHunks();
    if (!hunks.length) {
      return (
        <div className="git-PaneView pane-item is-blank">
          <span className="icon icon-info">File has no contents</span>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      return (
        <div className="git-PaneView pane-item">
          <FilePatchView
            ref="filePatchView"
            stageOrUnstageHunk={this.stageOrUnstageHunk}
            attemptLineStageOperation={this.attemptLineStageOperation}
            hunks={hunks}
            stagingStatus={this.props.stagingStatus}
            registerHunkView={this.props.registerHunkView}
          />
        </div>
      );
    }
  }

  stageHunk(hunk) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForHunk(hunk),
    );
  }

  unstageHunk(hunk) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForHunk(hunk),
    );
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

  stageLines(lines) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForLines(lines),
    );
  }

  unstageLines(lines) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForLines(lines),
    );
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

  attemptLineStageOperation(lines) {
    if (this.stagingOperationInProgress) {
      return {
        stageOperationPromise: Promise.resolve(),
        selectionUpdatePromise: Promise.resolve(),
      };
    }

    this.stagingOperationInProgress = true;

    const hunkUpdatePromise = this.refs.filePatchView.getNextHunkUpdatePromise();
    const stageOperationPromise = this.stageOrUnstageLines(lines);
    const selectionUpdatePromise = hunkUpdatePromise.then(() => {
      this.stagingOperationInProgress = false;
    });

    return {stageOperationPromise, selectionUpdatePromise};
  }

  getTitle() {
    let title = this.props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += this.props.filePatch.getPath();
    return title;
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  didUpdateFilePatch() {
    // FilePatch was mutated so all we need to do is re-render
    return etch.update(this);
  }

  didDestroyFilePatch() {
    this.destroy();
  }

  focus() {
    if (this.refs.filePatchView) {
      this.refs.filePatchView.focus();
    }
  }
}
