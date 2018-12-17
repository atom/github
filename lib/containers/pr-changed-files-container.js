import React from 'react';
import PropTypes from 'prop-types';
import {parse as parseDiff} from 'what-the-diff';

import {ItemTypePropType, EndpointPropType} from '../prop-types';
import MultiFilePatchController from '../controllers/multi-file-patch-controller';
import LoadingView from '../views/loading-view';
import ErrorView from '../views/error-view';
import {buildMultiFilePatch} from '../models/patch';

export default class PullRequestChangedFilesContainer extends React.Component {
  static propTypes = {
    // Pull request properties
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,

    // Connection properties
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,

    // action methods
    destroy: PropTypes.func.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    // local repo as opposed to pull request repo
    localRepository: PropTypes.object.isRequired,

    // refetch diff on refresh
    shouldRefetch: PropTypes.bool.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {isLoading: true, error: null};
    this.fetchDiff();
  }

  componentDidUpdate(prevProps) {
    if (this.props.shouldRefetch && !prevProps.shouldRefetch) {
      this.setState({isLoading: true, error: null});
      this.fetchDiff();
    }
  }

  // Generate a v3 GitHub API REST URL for the pull request resource.
  // Example: https://api.github.com/repos/atom/github/pulls/1829
  getDiffURL() {
    return this.props.endpoint.getRestURI('repos', this.props.owner, this.props.repo, 'pulls', this.props.number);
  }

  buildPatch(rawDiff) {
    const diffs = parseDiff(rawDiff);
    return buildMultiFilePatch(diffs);
  }

  async fetchDiff() {
    const diffError = (message, err = null) => new Promise(resolve => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
      this.setState({isLoading: false, error: message}, resolve);
    });
    const url = this.getDiffURL();

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3.diff',
        Authorization: `bearer ${this.props.token}`,
      },
      // eslint-disable-next-line handle-callback-err
    }).catch(err => {
      diffError(`Network error encountered at fetching ${url}`, err);
    });
    if (this.state.error) {
      return;
    }
    try {
      if (response && response.ok) {
        const rawDiff = await response.text();
        const multiFilePatch = this.buildPatch(rawDiff);
        await new Promise(resolve => this.setState({isLoading: false, multiFilePatch}, resolve));
      } else {
        diffError(`Unable to fetch diff for this pull request${response ? ': ' + response.statusText : ''}.`);
      }
    } catch (err) {
      diffError('Unable to parse diff for this pull request.', err);
    }
  }

  render() {
    if (this.state.isLoading) {
      return <LoadingView />;
    }

    if (this.state.error) {
      return <ErrorView descriptions={[this.state.error]} />;
    }

    return (
      <MultiFilePatchController
        multiFilePatch={this.state.multiFilePatch}
        repository={this.props.localRepository}
        {...this.props}
      />
    );
  }
}
