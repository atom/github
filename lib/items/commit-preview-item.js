import React from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';

import {WorkdirContextPoolPropType} from '../prop-types';
import CommitPreviewContainer from '../containers/commit-preview-container';

export default class CommitPreviewItem extends React.Component {
  static propTypes = {
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    workingDirectory: PropTypes.string.isRequired,
  }

  static uriPattern = 'atom-github://commit-preview?workdir={workingDirectory}'

  static buildURI(workingDirectory) {
    return `atom-github://commit-preview?workdir=${encodeURIComponent(workingDirectory)}`;
  }

  constructor(props) {
    super(props);

    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;
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
    /* istanbul ignore else */
    if (!this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  render() {
    const repository = this.props.workdirContextPool.getContext(this.props.workingDirectory).getRepository();

    return (
      <CommitPreviewContainer
        repository={repository}
        {...this.props}
      />
    );
  }

  getTitle() {
    return 'Commit preview';
  }

  getIconName() {
    return 'git-commit';
  }

  getWorkingDirectory() {
    return this.props.workingDirectory;
  }

  serialize() {
    return {
      deserializer: 'CommitPreviewStub',
      uri: CommitPreviewItem.buildURI(this.props.workingDirectory),
    };
  }
}
