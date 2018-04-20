import React from 'react';
import PropTypes from 'prop-types';

import RecentCommitsView from '../views/recent-commits-view';

export default class RecentCommitsController extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
  }

  render() {
    return (
      <RecentCommitsView
        commits={this.props.commits}
        isLoading={this.props.isLoading}
        undoLastCommit={this.props.undoLastCommit}
      />
    );
  }
}
