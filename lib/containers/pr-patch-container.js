import React from 'react';
import PropTypes from 'prop-types';
import {parse as parseDiff} from 'what-the-diff';

import {toNativePathSep} from '../helpers';
import {EndpointPropType} from '../prop-types';
import {buildMultiFilePatch} from '../models/patch';

export default class PullRequestPatchContainer extends React.Component {
  static propTypes = {
    // Pull request properties
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,

    // Connection properties
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Refetch diff on next component update
    refetch: PropTypes.bool,

    // Render prop. Called with (error or null, multiFilePatch or null)
    children: PropTypes.func.isRequired,
  }

  state = {
    multiFilePatch: null,
    error: null,
  }

  componentDidMount() {
    this.mounted = true;
    this.fetchDiff();
  }

  componentDidUpdate(prevProps) {
    if (this.props.refetch && !prevProps.refetch) {
      this.setState({multiFilePatch: null, error: null});
      this.fetchDiff();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    return this.props.children(this.state.error, this.state.multiFilePatch);
  }

  // Generate a v3 GitHub API REST URL for the pull request resource.
  // Example: https://api.github.com/repos/atom/github/pulls/1829
  getDiffURL() {
    return this.props.endpoint.getRestURI('repos', this.props.owner, this.props.repo, 'pulls', this.props.number);
  }

  buildPatch(rawDiff) {
    const diffs = parseDiff(rawDiff).map(diff => {
    // diff coming from API will have the defaul git diff prefixes a/ and b/ and use *nix-style / path separators.
    // e.g. a/dir/file1.js and b/dir/file2.js
    // see https://git-scm.com/docs/git-diff#_generating_patches_with_p
      return {
        ...diff,
        newPath: diff.newPath ? toNativePathSep(diff.newPath.replace(/^[a|b]\//, '')) : diff.newPath,
        oldPath: diff.oldPath ? toNativePathSep(diff.oldPath.replace(/^[a|b]\//, '')) : diff.oldPath,
      };
    });
    return buildMultiFilePatch(diffs, {preserveOriginal: true});
  }

  async fetchDiff() {
    const url = this.getDiffURL();
    let response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3.diff',
          Authorization: `bearer ${this.props.token}`,
        },
      });
    } catch (err) {
      return this.reportDiffError(`Network error encountered fetching the patch: ${err.message}.`, err);
    }

    if (!response.ok) {
      return this.reportDiffError(`Unable to fetch the diff for this pull request: ${response.statusText}.`);
    }

    try {
      const rawDiff = await response.text();
      if (!this.mounted) {
        return null;
      }

      const multiFilePatch = this.buildPatch(rawDiff);
      return new Promise(resolve => this.setState({multiFilePatch}, resolve));
    } catch (err) {
      return this.reportDiffError('Unable to parse the diff for this pull request.', err);
    }
  }

  reportDiffError(message, error) {
    return new Promise(resolve => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }

      if (!this.mounted) {
        resolve();
        return;
      }

      this.setState({error: message}, resolve);
    });
  }
}
