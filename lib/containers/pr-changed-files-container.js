import React from 'react';
import PropTypes from 'prop-types';

import PullRequestChangedFilesController from '../controllers/pr-changed-files-controller';
import LoadingView from '../views/loading-view';

export default class PullRequestChangedFilesContainer extends React.Component {
  static propTypes = {
    pullRequestURL: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {isLoading: true};
    const patchDiffURL = this.generatePatchDiffURL(this.props.pullRequestURL);
    this.fetchData(patchDiffURL);
  }

  // todo: deal with when we need to refetch data
  async fetchData(URL) {
    const response = await fetch(URL);
    if (response.ok) {
      const data = await response.text();
      this.setState({isLoading: false, data});
    } else {
      // todo: make error messages more user friendly / readable
      this.setState({isLoading: false, error: response.statusText});
    }
  }

  // https://github.com/atom/github/pull/1804 becomes something like
  // https://patch-diff.githubusercontent.com/raw/atom/github/pull/1829.diff
  generatePatchDiffURL(pullRequestURL) {
    const prURL = new URL(pullRequestURL);
    const splitPath = prURL.pathname.split('/');
    const orgName = splitPath[1];
    const repoName = splitPath[2];
    const pullRequestId = splitPath[4];
    return `https://patch-diff.githubusercontent.com/raw/${orgName}/${repoName}/pull/${pullRequestId}.diff`;
  }

  render() {
    if (this.state.isLoading) {
      return <LoadingView />;
    }

    if (this.state.error) {
      return (<div>{this.state.error}</div>);
    }

    return (
      <PullRequestChangedFilesController
        data={this.state.data}
        {...this.props}
      />
    );
  }
}
