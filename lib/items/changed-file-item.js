import React from 'react';
import PropTypes from 'prop-types';
import ItemComponent from './item-component';

import {WorkdirContextPoolPropType} from '../prop-types';
import ChangedFileContainer from '../containers/changed-file-container';

export default class ChangedFileItem extends ItemComponent {
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

  constructor(props) {
    super(props, {});

    this.refHolder.observe(editor => {
      this.emitter.emit('did-change-embedded-text-editor', editor);
    });
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
        destroy={this.destroy}
        refEditor={this.refHolder}
        {...this.props}
      />
    );
  }

  observeEmbeddedTextEditor(cb) {
    this.refHolder.map(editor => cb(editor));
    return this.emitter.on('did-change-embedded-text-editor', cb);
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
