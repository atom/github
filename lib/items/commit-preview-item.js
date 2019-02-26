import React from 'react';
import PropTypes from 'prop-types';
import ItemComponent from './item-component';

import {WorkdirContextPoolPropType} from '../prop-types';
import CommitPreviewContainer from '../containers/commit-preview-container';
import RefHolder from '../models/ref-holder';

export default class CommitPreviewItem extends ItemComponent {
  static propTypes = {
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    workingDirectory: PropTypes.string.isRequired,

    discardLines: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    surfaceToCommitPreviewButton: PropTypes.func.isRequired,
  }

  static uriPattern = 'atom-github://commit-preview?workdir={workingDirectory}'

  static buildURI(workingDirectory) {
    return `atom-github://commit-preview?workdir=${encodeURIComponent(workingDirectory)}`;
  }

  constructor(props) {
    super(props, {title: 'Staged Changes', icon: 'tasklist'});

    this.refInitialFocus = new RefHolder();

    this.refHolder.observe(editor => {
      this.emitter.emit('did-change-embedded-text-editor', editor);
    });
  }

  render() {
    const repository = this.props.workdirContextPool.getContext(this.props.workingDirectory).getRepository();

    return (
      <CommitPreviewContainer
        itemType={this.constructor}
        repository={repository}
        {...this.props}
        destroy={this.destroy}
        refEditor={this.refHolder}
        refInitialFocus={this.refInitialFocus}
      />
    );
  }

  observeEmbeddedTextEditor(cb) {
    this.refHolder.map(editor => cb(editor));
    return this.emitter.on('did-change-embedded-text-editor', cb);
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

  focus() {
    this.refInitialFocus.map(focusable => focusable.focus());
  }
}
