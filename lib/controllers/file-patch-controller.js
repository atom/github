/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {Emitter} from 'atom';
import etch from 'etch';
import {autobind} from 'core-decorators';

import FilePatchView from '../views/file-patch-view';

export default class FilePatchController {
  constructor(props) {
    this.props = props;
    this.emitter = new Emitter();
    this.stagingOperationInProgress = false;
    etch.initialize(this);
  }

  serialize() {
    return null;
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
        <div className="github-PaneView pane-item is-blank">
          <span className="icon icon-info">File has no contents</span>
        </div>
      );
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      return (
        <div className="github-PaneView pane-item">
          <FilePatchView
            ref="filePatchView"
            commandRegistry={this.props.commandRegistry}
            attemptLineStageOperation={this.attemptLineStageOperation}
            didSurfaceFile={this.didSurfaceFile}
            attemptHunkStageOperation={this.attemptHunkStageOperation}
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

  async unstageHunk(hunk, includesRemainingHunk) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForHunk(hunk),
    );
    if (includesRemainingHunk && this.props.filePatch.status === 'added') {
      await this.resetEmptyFile();
    }
  }

  stageOrUnstageHunk(hunk, includesRemainingHunk) {
    if (this.props.stagingStatus === 'unstaged') {
      return this.stageHunk(hunk);
    } else if (this.props.stagingStatus === 'staged') {
      return this.unstageHunk(hunk, includesRemainingHunk);
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`);
    }
  }

  @autobind
  attemptHunkStageOperation(hunk, includesRemainingHunk) {
    if (this.stagingOperationInProgress) {
      return {
        stageOperationPromise: Promise.resolve(),
        selectionUpdatePromise: Promise.resolve(),
      };
    }

    this.stagingOperationInProgress = true;

    const hunkUpdatePromise = this.refs.filePatchView.getNextHunkUpdatePromise();
    const stageOperationPromise = this.stageOrUnstageHunk(hunk, includesRemainingHunk);
    const selectionUpdatePromise = hunkUpdatePromise.then(() => {
      this.stagingOperationInProgress = false;
    });

    return {stageOperationPromise, selectionUpdatePromise};
  }

  stageLines(lines) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForLines(lines),
    );
  }

  async unstageLines(lines, includesRemainingLines) {
    await this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForLines(lines),
    );
    if (includesRemainingLines && this.props.filePatch.status === 'added') {
      await this.resetEmptyFile();
    }
  }

  async resetEmptyFile() {
    const filePath = this.props.filePatch.getPath();
    try {
      const contents = await this.props.repository.getIndexContentsForPath(filePath);
      if (contents.length === 0) {
        await this.props.repository.unstageFiles([filePath]);
      }
    } catch (err) {
      // file is no longer on index
    }
  }

  stageOrUnstageLines(lines, includesRemainingLines) {
    if (this.props.stagingStatus === 'unstaged') {
      return this.stageLines(lines);
    } else if (this.props.stagingStatus === 'staged') {
      return this.unstageLines(lines, includesRemainingLines);
    } else {
      throw new Error(`Unknown stagingStatus: ${this.props.stagingStatus}`);
    }
  }

  @autobind
  attemptLineStageOperation(lines, includesRemainingLines) {
    if (this.stagingOperationInProgress) {
      return {
        stageOperationPromise: Promise.resolve(),
        selectionUpdatePromise: Promise.resolve(),
      };
    }

    this.stagingOperationInProgress = true;

    const hunkUpdatePromise = this.refs.filePatchView.getNextHunkUpdatePromise();
    const stageOperationPromise = this.stageOrUnstageLines(lines, includesRemainingLines);
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

  @autobind
  didSurfaceFile() {
    if (this.props.didSurfaceFile) {
      this.props.didSurfaceFile(this.props.filePatch.getPath(), this.props.stagingStatus);
    }
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
