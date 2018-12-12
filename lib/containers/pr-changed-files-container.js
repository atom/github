import React from 'react';
import PropTypes from 'prop-types';

import PullRequestChangedFilesController from '../controllers/pr-changed-files-controller';
import LoadingView from '../views/loading-view';

export default class PullRequestChangedFilesContainer extends React.Component {
  static propTypes = {
    // Pull request properties
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,

    // Connection properties
    token: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {isLoading: true};
    this.fetchDiff();
  }

  // Generate a v3 GitHub API REST URL for the pull request resource.
  // Example: https://api.github.com/repos/atom/github/pulls/1829
  getDiffURL() {
    // TODO centralize endpoint translation logic between here and lib/relay-network-layer-manager.js.
    // Maybe move it to the Remote model instead?
    const endpoint = this.props.host === 'github.com' ? 'https://api.github.com' : this.props.host;
    return `${endpoint}/repos/${this.props.owner}/${this.props.repo}/pulls/${this.props.number}`;
  }

  // TODO: deal with when we need to refetch data
  async fetchDiff() {
    const url = this.getDiffURL();
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
        Authorization: `bearer ${this.props.token}`,
      },
    });
    if (response.ok) {
      const diff = await response.text();
      await new Promise(resolve => this.setState({isLoading: false, diff}, resolve));
    } else {
      // TODO: make error messages more user friendly / readable
      await new Promise(resolve => this.setState({isLoading: false, error: response.statusText}, resolve));
    }
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
        diff={this.state.diff}
        {...this.props}
        itemType={this.constructor}
      />
    );
  }
}
