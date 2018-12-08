import React from 'react';
import PropTypes from 'prop-types';

import PullRequestChangedFilesView from '../views/pr-changed-files-view';

export default class PullRequestChangedFilesController extends React.Component {

  render() {
    return (<PullRequestChangedFilesView />);
  }
}
