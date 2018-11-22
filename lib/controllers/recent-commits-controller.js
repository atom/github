import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from '../helpers';
import {addEvent} from '../reporter-proxy';

import CommitDetailItem from '../items/commit-detail-item';
import RecentCommitsView from '../views/recent-commits-view';

export default class RecentCommitsController extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    autobind(this, 'openCommit');
  }

  render() {
    return (
      <RecentCommitsView
        commits={this.props.commits}
        isLoading={this.props.isLoading}
        undoLastCommit={this.props.undoLastCommit}
        openCommit={this.openCommit}
      />
    );
  }

  openCommit({sha}) {
    const workdir = this.props.repository.getWorkingDirectoryPath();
    const uri = CommitDetailItem.buildURI(workdir, sha);
    this.props.workspace.open(uri).then(() => {
      addEvent('open-commit-in-pane', {package: 'github', from: 'dialog'});
    });
  }
}
