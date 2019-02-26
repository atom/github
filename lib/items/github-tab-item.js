import React from 'react';
import PropTypes from 'prop-types';

import {GithubLoginModelPropType} from '../prop-types';
import ItemComponent from './item-component';
import GitHubTabContainer from '../containers/github-tab-container';

export default class GitHubTabItem extends ItemComponent {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object,
    loginModel: GithubLoginModelPropType.isRequired,

    documentActiveElement: PropTypes.func,
  }

  static defaultProps = {
    documentActiveElement: /* istanbul ignore next */ () => document.activeElement,
  }

  static uriPattern = 'atom-github://dock-item/github';

  static buildURI() {
    return this.uriPattern;
  }

  constructor(props) {
    super(props, {title: 'GitHub', icon: 'octoface'});
  }

  getDefaultLocation() {
    return 'right';
  }

  getPreferredWidth() {
    return 400;
  }

  getWorkingDirectory() {
    return this.props.repository.getWorkingDirectoryPath();
  }

  serialize() {
    return {
      deserializer: 'GithubDockItem',
      uri: this.getURI(),
    };
  }

  render() {
    return (
      <GitHubTabContainer {...this.props} rootHolder={this.refHolder} />
    );
  }

  hasFocus() {
    return this.refHolder.map(root => root.contains(this.props.documentActiveElement())).getOr(false);
  }

  restoreFocus() {
    // No-op
  }

  // no-op
  destroy() {
    return false;
  }

  // no-op
  terminatePendingState() {
    return false;
  }
}
