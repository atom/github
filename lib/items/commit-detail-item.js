import React from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';

import {WorkdirContextPoolPropType} from '../prop-types';
import CommitDetailContainer from '../containers/commit-detail-container';
import RefHolder from '../models/ref-holder';

export default class CommitDetailItem extends React.Component {
  static propTypes = {
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    workingDirectory: PropTypes.string.isRequired,
    sha: PropTypes.string.isRequired,

    surfaceToCommitDetailButton: PropTypes.func.isRequired,
  }

  static uriPattern = 'atom-github://commit-detail?sha={sha}'

  static buildURI(sha) {
    return `atom-github://commit-detail?sha=${encodeURIComponent(sha)}`;
  }

  constructor(props) {
    super(props);

    console.log('item');
    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;
    this.refInitialFocus = new RefHolder();
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

  destroy = () => {
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
      <CommitDetailContainer
        itemType={this.constructor}
        repository={repository}
        {...this.props}
        destroy={this.destroy}
        refInitialFocus={this.refInitialFocus}
      />
    );
  }

  getTitle() {
    return `Commit: ${this.props.sha}`;
  }

  getIconName() {
    return 'git-commit';
  }

  getWorkingDirectory() {
    return this.props.workingDirectory;
  }

  serialize() {
    return {
      deserializer: 'CommitDetailStub',
      uri: CommitDetailItem.buildURI(this.props.sha),
    };
  }

  focus() {
    this.refInitialFocus.map(focusable => focusable.focus());
  }
}
