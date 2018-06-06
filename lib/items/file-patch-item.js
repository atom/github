import React from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';

import FilePatchContainer from '../containers/file-patch-container';

export default class FilePatchItem extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    relPath: PropTypes.string.isRequired,

    tooltips: PropTypes.object.isRequired,
  }

  static uriPattern = 'atom-github://file-patch/{relPath...}?workdir={workdir}&stagingStatus={stagingStatus}'

  static buildURI(relPath, workdir, stagingStatus) {
    return 'atom-github://file-patch/' +
      relPath +
      `?workdir=${encodeURIComponent(workdir)}` +
      `&stagingStatus=${encodeURIComponent(stagingStatus)}`;
  }

  constructor(props) {
    super(props);

    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;
  }

  getTitle() {
    let title = this.props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += this.props.relPath;
    return title;
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
    if (!this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  render() {
    return (
      <FilePatchContainer
        repository={this.props.repository}
        stagingStatus={this.props.stagingStatus}
        relPath={this.props.relPath}
        tooltips={this.props.tooltips}
      />
    );
  }

  serialize() {
    return {
      deserializer: 'FilePatchControllerStub',
      uri: this.getURI(),
    };
  }

  getStagingStatus() {
    return this.props.stagingStatus;
  }

  getFilePath() {
    return this.props.relPath;
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
  }
}
