import React from 'react';
import PropTypes from 'prop-types';

import {RemotePropType, BranchSetPropType} from '../prop-types';

export default class CreatePullRequestTile extends React.Component {
  static propTypes = {
    repository: PropTypes.shape({
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    onCreatePr: PropTypes.func.isRequired,
  }

  render() {
    if (this.isRepositoryNotFound()) {
      return (
        <div className="github-CreatePullRequestTile-message">
          <strong>Repository not found</strong> for the remote <code>{this.props.remote.getName()}</code>.
          Do you need to update your remote URL?
        </div>
      );
    }

    if (this.isDetachedHead()) {
      return (
        <div className="github-CreatePullRequestTile-message">
          You are not currently on any branch.
          &nbsp;<strong>Create a new branch</strong>&nbsp;
          to share your work with a pull request.
        </div>
      );
    }

    if (this.hasNoDefaultRef()) {
      return (
        <div className="github-CreatePullRequestTile-message">
          The repository at remote <code>{this.props.remote.getName()}</code> is
          empty. Push a main branch to begin sharing your work.
        </div>
      );
    }

    if (this.isOnDefaultRef()) {
      return (
        <div className="github-CreatePullRequestTile-message">
          You are currently on your repository's default branch.
          &nbsp;<strong>Create a new branch</strong>&nbsp;
          to share your work with a pull request.
        </div>
      );
    }

    if (this.isSameAsDefaultRef()) {
      return (
        <div className="github-CreatePullRequestTile-message">
          Your current branch has not moved from the repository's default branch.
          &nbsp;<strong>Make some commits</strong>&nbsp;
          to share your work with a pull request.
        </div>
      );
    }

    let message = 'Open new pull request';
    let disable = false;
    const differentRemote = this.pushesToDifferentRemote();
    if (this.props.pushInProgress) {
      message = 'Pushing...';
      disable = true;
    } else if (!this.hasUpstreamBranch() || differentRemote) {
      message = 'Publish + open new pull request';
    } else if (this.props.aheadCount > 0) {
      message = 'Push + open new pull request';
    }

    return (
      <div>
        {differentRemote &&
          <div className="github-CreatePullRequestTile-message">
            Your current branch is configured to push to the remote
            <code>{this.props.branches.getHeadBranch().getPush().getRemoteName()}</code>.
            Publish it to <code>{this.props.remote.getName()}</code> instead?
          </div>
        }
        <p className="github-CreatePullRequestTile-controls">
          <button
            className="github-CreatePullRequestTile-createPr btn btn-primary"
            onClick={this.props.onCreatePr}
            disabled={disable}>
            {message}
          </button>
        </p>
      </div>
    );
  }

  isRepositoryNotFound() {
    return !this.props.repository;
  }

  isDetachedHead() {
    return !this.props.branches.getHeadBranch().isPresent();
  }

  hasNoDefaultRef() {
    return !this.props.repository.defaultBranchRef;
  }

  isOnDefaultRef() {
    if (!this.props.repository) { return false; }
    const defaultRef = this.props.repository.defaultBranchRef;
    if (!defaultRef) { return false; }

    const currentBranch = this.props.branches.getHeadBranch();
    return currentBranch.getPush().getRemoteRef() === `${defaultRef.prefix}${defaultRef.name}`;
  }

  isSameAsDefaultRef() {
    if (!this.props.repository) { return false; }
    const defaultRef = this.props.repository.defaultBranchRef;
    if (!defaultRef) { return false; }

    const currentBranch = this.props.branches.getHeadBranch();
    const mainBranches = this.props.branches.getPushSources(
      this.props.remote.getName(), `${defaultRef.prefix}${defaultRef.name}`);
    return mainBranches.some(branch => branch.getSha() === currentBranch.getSha());
  }

  pushesToDifferentRemote() {
    const p = this.props.branches.getHeadBranch().getPush();
    if (!p.isRemoteTracking()) { return false; }

    const pushRemoteName = p.getRemoteName();
    return pushRemoteName !== this.props.remote.getName();
  }

  hasUpstreamBranch() {
    return this.props.branches.getHeadBranch().getUpstream().isPresent();
  }
}
