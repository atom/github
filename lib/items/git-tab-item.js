import React from 'react';
import PropTypes from 'prop-types';

import GitTabContainer from '../containers/git-tab-container';

export default class GitTabItem extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
  }

  render() {
    return (
      <GitTabContainer {...this.props} />
    );
  }

  serialize() {
    return {
      deserializer: 'GitDockItem',
      uri: this.getURI(),
    };
  }

  getTitle() {
    return 'Git';
  }

  getIconName() {
    return 'git-commit';
  }

  getDefaultLocation() {
    return 'right';
  }

  getPreferredWidth() {
    return 400;
  }

  getURI() {
    return 'atom-github://dock-item/git';
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
  }
}
