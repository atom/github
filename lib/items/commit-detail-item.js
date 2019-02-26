import React from 'react';
import PropTypes from 'prop-types';

import ItemComponent from './item-component';
import {WorkdirContextPoolPropType} from '../prop-types';
import CommitDetailContainer from '../containers/commit-detail-container';
import RefHolder from '../models/ref-holder';

export default class CommitDetailItem extends ItemComponent {
  static propTypes = {
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    workingDirectory: PropTypes.string.isRequired,
    sha: PropTypes.string.isRequired,
  }

  static uriPattern = 'atom-github://commit-detail?workdir={workingDirectory}&sha={sha}'

  static buildURI(workingDirectory, sha) {
    return `atom-github://commit-detail?workdir=${encodeURIComponent(workingDirectory)}&sha=${encodeURIComponent(sha)}`;
  }

  constructor(props) {
    super(props, {title: 'Commit', icon: 'git-commit'});

    this.shouldFocus = true;
    this.refInitialFocus = new RefHolder();

    this.refHolder.observe(editor => {
      this.emitter.emit('did-change-embedded-text-editor', editor);
    });
  }

  render() {
    const repository = this.props.workdirContextPool.getContext(this.props.workingDirectory).getRepository();

    return (
      <CommitDetailContainer
        itemType={this.constructor}
        repository={repository}
        {...this.props}
        destroy={this.destroy}
        refEditor={this.refHolder}
        refInitialFocus={this.refInitialFocus}
      />
    );
  }

  getTitle() {
    return `Commit: ${this.props.sha}`;
  }

  observeEmbeddedTextEditor(cb) {
    this.refHolder.map(editor => cb(editor));
    return this.emitter.on('did-change-embedded-text-editor', cb);
  }

  getWorkingDirectory() {
    return this.props.workingDirectory;
  }

  getSha() {
    return this.props.sha;
  }

  serialize() {
    return {
      deserializer: 'CommitDetailStub',
      uri: CommitDetailItem.buildURI(this.props.workingDirectory, this.props.sha),
    };
  }

  preventFocus() {
    this.shouldFocus = false;
  }

  focus() {
    this.refInitialFocus.getPromise().then(focusable => {
      if (!this.shouldFocus) {
        return;
      }

      focusable.focus();
    });
  }
}
