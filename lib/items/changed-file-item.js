import React from 'react';
import PropTypes from 'prop-types';

import {WorkdirContextPoolPropType} from '../prop-types';
import ChangedFileContainer from '../containers/changed-file-container';

export default class ChangedFileItem extends React.Component {
  static propTypes = {
    workdirContextPool: WorkdirContextPoolPropType.isRequired,

    relPath: PropTypes.string.isRequired,
    workingDirectory: PropTypes.string.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    discardLines: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    surfaceFileAtPath: PropTypes.func.isRequired,
  }

  static uriPattern = 'atom-github://file-patch/{relPath...}?workdir={workingDirectory}&stagingStatus={stagingStatus}'

  static buildURI(relPath, workingDirectory, stagingStatus) {
    return 'atom-github://file-patch/' +
      encodeURIComponent(relPath) +
      `?workdir=${encodeURIComponent(workingDirectory)}` +
      `&stagingStatus=${encodeURIComponent(stagingStatus)}`;
  }

  componentDidMount() {
    this.props.handleTitleChanged(this.getTitle())
  }

  getTitle() {
    let title = this.props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged';
    title += ' Changes: ';
    title += this.props.relPath;
    return title;
  }

  render() {
    const repository = this.props.workdirContextPool.getContext(this.props.workingDirectory).getRepository();

    return (
      <ChangedFileContainer
        itemType={this.constructor}
        repository={repository}
        refEditor={this.props.refHolder}
        {...this.props}
      />
    );
  }

  serialize() {
    return {
      deserializer: 'FilePatchControllerStub',
      uri: ChangedFileItem.buildURI(this.props.relPath, this.props.workingDirectory, this.props.stagingStatus),
    };
  }

  getStagingStatus() {
    return this.props.stagingStatus;
  }

  getFilePath() {
    return this.props.relPath;
  }

  getWorkingDirectory() {
    return this.props.workingDirectory;
  }

  isFilePatchItem() {
    return true;
  }
}
