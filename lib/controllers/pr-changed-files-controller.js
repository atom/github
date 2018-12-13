import React from 'react';
import PropTypes from 'prop-types';

import PullRequestChangedFilesView from '../views/pr-changed-files-view';

export default class PullRequestChangedFilesController extends React.Component {
  static propTypes = {
    multiFilePatch: PropTypes.object.isRequired,
  }

  render() {
    return (
      <PullRequestChangedFilesView
        {...this.props}
      />
    );
  }
}
