import React from 'react';
import PropTypes from 'prop-types';

import ItemComponent from './item-component';
import GitTabContainer from '../containers/git-tab-container';

export default class GitTabItem extends ItemComponent {
  static propTypes = {
    repository: PropTypes.object.isRequired,
  }

  static uriPattern = 'atom-github://dock-item/git'

  static buildURI() {
    return this.uriPattern;
  }

  constructor(props) {
    super(props, {title: 'Git', icon: 'git-commit'});
  }

  render() {
    return (
      <GitTabContainer
        controllerRef={this.refHolder}
        {...this.props}
      />
    );
  }

  serialize() {
    return {
      deserializer: 'GitDockItem',
      uri: this.getURI(),
    };
  }

  getDefaultLocation() {
    return 'right';
  }

  getPreferredWidth() {
    return 400;
  }

  getURI() {
    return this.constructor.uriPattern;
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
  }

  // no-op
  destroy() {
    return false;
  }

  // no-op
  terminatePendingState() {
    return false;
  }

  // Forwarded to the controller instance when one is present

  rememberLastFocus(...args) {
    return this.refHolder.map(c => c.rememberLastFocus(...args));
  }

  restoreFocus(...args) {
    return this.refHolder.map(c => c.restoreFocus(...args));
  }

  hasFocus(...args) {
    return this.refHolder.map(c => c.hasFocus(...args));
  }

  focus() {
    return this.refHolder.map(c => c.restoreFocus());
  }

  focusAndSelectStagingItem(...args) {
    return this.refHolder.map(c => c.focusAndSelectStagingItem(...args));
  }

  focusAndSelectCommitPreviewButton() {
    return this.refHolder.map(c => c.focusAndSelectCommitPreviewButton());
  }

  quietlySelectItem(...args) {
    return this.refHolder.map(c => c.quietlySelectItem(...args));
  }

  focusAndSelectRecentCommit() {
    return this.refHolder.map(c => c.focusAndSelectRecentCommit());
  }
}
