import {Emitter} from 'event-kit';

import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';

import GithubPackage from '../github-package';
import FilePatchController from '../controllers/file-patch-controller';

function getPropsFromUri(uri) {
  // atom-github://file-patch/file.txt?stagingStatus=staged&amending&lineNum=12
  const {protocol, hostname, pathname, query} = url.parse(uri, true);
  if (protocol === 'atom-github:' && hostname === 'file-patch') {
    const filePath = pathname.slice(1);
    const {stagingStatus, amending, lineNum} = query;
    return {
      filePath,
      stagingStatus,
      amending: amending !== undefined,
      lineNumber: lineNum !== undefined ? parseInt(lineNum, 10) : null,
    };
  }
  return null;
}

export default class FilePatchPaneItem {
  static opener(uri) {
    const props = getPropsFromUri(uri);
    if (props) {
      return FilePatchPaneItem.create(props, uri);
    } else {
      return null;
    }
  }

  static create({filePath, stagingStatus, amending, lineNumber}, uri) {
    return new FilePatchPaneItem({filePath, stagingStatus, amending, lineNumber}, uri);
  }

  constructor({filePath, stagingStatus, amending, lineNumber}, uri) {
    this.emitter = new Emitter();

    this.filePath = filePath;
    this.stagingStatus = stagingStatus;
    this.amending = amending;
    this.lineNumber = lineNumber;
    this.uri = uri;
    const prefix = stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    this.title = `${prefix} Changes: ${filePath}`;
    this.rootController = GithubPackage.getRootController();
    this.componentPromise = this.createComponent();
    this.workingDirectoryPath = this.rootController.props.activeWorkingDirectory;
  }

  async createComponent() {
    this.element = document.createElement('div');
    const rc = this.rootController;
    const repository = rc.props.repository;
    const staged = this.stagingStatus === 'staged';
    const isPartiallyStaged = await repository.isPartiallyStaged(this.filePath);
    const filePatch = await repository.getFilePatchForPath(this.filePath, {staged, amending: staged && this.amending});
    const props = {
      filePatch,
      lineNumber: this.lineNumber,
      stagingStatus: this.stagingStatus,
      isAmending: this.amending,
      isPartiallyStaged,
      repository,
      workingDirectoryPath: this.workingDirectoryPath,
      commandRegistry: rc.props.commandRegistry,
      tooltips: rc.props.tooltips,
      switchboard: rc.props.switchboard,
      onRepoRefresh: rc.onRepoRefresh,
      didSurfaceFile: rc.surfaceFromFileAtPath,
      quietlySelectItem: rc.quietlySelectItem,
      getSelectedStagingViewItems: rc.getSelectedStagingViewItems,
      openFiles: rc.openFiles,
      discardLines: rc.discardLines,
      undoLastDiscard: rc.undoLastDiscard,
    };
    this.component = ReactDom.render(<FilePatchController {...props} />, this.element);
    this.componentPromise = null;
  }

  async focus() {
    if (this.componentPromise) {
      await this.componentPromise;
    }
    this.component.focus();
  }

  getElement() {
    return this.element;
  }

  /**
   * Used to detect the context when this PaneItem is active
   */
  getWorkingDirectory() {
    return this.workingDirectoryPath;
  }

  serialize() {
    return {
      uri: this.uri,
      deserializer: 'FilePatchPaneItem',
    };
  }

  getURI() {
    return this.uri;
  }

  getTitle() {
    return this.title;
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

  destroy() {
    // TODO: is this right?
    this.emitter.emit('did-destroy');
    this.emitter.dispose();
    ReactDom.unmountComponentAtNode(this.getElement());
  }
}
