import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';
import Octicon from '../views/octicon';
import {RemotePropType, BranchSetPropType} from '../prop-types';

export class PrSelectionByBranch extends React.Component {
  static propTypes = {
    repository: PropTypes.shape({
      defaultBranchRef: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }).isRequired,
      pullRequests: PropTypes.shape({
        totalCount: PropTypes.number.isRequired,
        edges: PropTypes.arrayOf(PropTypes.shape({
          node: PropTypes.shape({
            id: PropTypes.string.isRequired,
            number: PropTypes.number.isRequired,
            title: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired,
          }).isRequired,
        })).isRequired,
      }),
    }),
    onSelectPr: PropTypes.func.isRequired,
    onUnpinPr: PropTypes.func.isRequired,
    onCreatePr: PropTypes.func.isRequired,
    onSearchAgain: PropTypes.func.isRequired,
    variables: PropTypes.shape({
      repoOwner: PropTypes.string.isRequired,
      repoName: PropTypes.string.isRequired,
      branchName: PropTypes.string.isRequired,
    }),
    remote: RemotePropType,
    aheadCount: PropTypes.number,
    branches: BranchSetPropType.isRequired,
    pushInProgress: PropTypes.bool.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {displayInputBox: false};
  }

  render() {
    return (
      <div className="github-PrSelectionByBranch">
        {this.renderSubview()}
      </div>
    );
  }

  renderSubview() {
    const repo = this.props.repository;
    const {variables} = this.props;
    if (!repo || !repo.pullRequests.edges.length) {
      return this.renderCreatePr();
    }

    const edges = repo.pullRequests.edges;
    if (edges.length === 1) {
      return (
        <div className="github-PrSelectionByBranch-container">
          <div>
            <div className="github-PrUrlInputBox-pinButton" onClick={this.toggleInputBoxVisibility}>
              <Octicon
                title="Click here to select another PR."
                icon="pin"
                className="pinned-by-url"
              />
              Specify Pull Request URL to pin
            </div>
            {this.state.displayInputBox &&
              <PrUrlInputBox onSubmit={this.props.onSelectPr}>
                <p>
                  We found a pull request associated with the branch {variables.branchName} on the
                  repository {variables.repoOwner}/{variables.repoName}.
                </p>
                <p>
                  You can manually pin a different GitHub pull request to the current branch by entering its URL:
                </p>
              </PrUrlInputBox>
            }
          </div>
          <PrInfoContainer pullRequest={edges[0].node} />
        </div>
      );
    }

    return this.renderPrSelectionList(edges, repo.pullRequests.totalCount);
  }

  renderCreatePr() {
    return (
      <div className="github-PrSelectionByBranch-container">
        <div className="github-PrSelectionByBranch-cell">
          <div className="github-CreatePr">
            <Octicon className="github-CreatePr-icon" icon="git-pull-request" />
            <h1 className="github-CreatePr-title">New Pull Request</h1>
            {this.renderCreatePrControl()}
          </div>
        </div>
        <hr className="github-PrSelectionByBranch-divider" />
        <div className="github-PrSelectionByBranch-cell">
          <PrUrlInputBox onSubmit={this.props.onSelectPr}>
            <p>
              <a className="github-PrSelectionByBranch-searchAgain" onClick={this.props.onSearchAgain}>Search again </a>
              to discover an existing pull request, or manually link a GitHub pull request to the current branch by
              entering its URL:
            </p>
          </PrUrlInputBox>
        </div>
      </div>
    );
  }

  renderCreatePrControl() {
    if (this.isDetachedHead()) {
      return (
        <div className="github-PrSelectionByBranch-message">
          You are not currently on any branch.
          &nbsp;<strong>Create a new branch</strong>
          to share your work with a pull request.
        </div>
      );
    }

    if (this.isOnDefaultRef()) {
      return (
        <div className="github-PrSelectionByBranch-message">
          You are currently on your repository's default branch.
          &nbsp;<strong>Create a new branch</strong>&nbsp;
          to share your work with a pull request.
        </div>
      );
    }

    if (this.isSameAsDefaultRef()) {
      return (
        <div className="github-PrSelectionByBranch-message">
          Your current branch has not moved from the repository's default branch.
          <strong>Make some commits</strong>&nbsp;
          to share your work with a pull request.
        </div>
      );
    }

    let message = 'Open new pull request';
    let disable = false;
    if (this.props.pushInProgress) {
      message = 'Pushing...';
      disable = true;
    } else if (!this.hasUpstreamBranch()) {
      message = 'Publish + open new pull request';
    } else if (this.props.aheadCount > 0) {
      message = 'Push + open new pull request';
    }

    return (
      <div>
        <p className="github-CreatePr-controls">
          <button
            className="github-PrSelectionByBranch-createPr btn btn-primary"
            onClick={this.props.onCreatePr}
            disabled={disable}>
            {message}
          </button>
        </p>
      </div>
    );
  }

  renderPrSelectionList(edges, totalCount) {
    const {variables} = this.props;
    return (
      <div className="github-PrSelectionByBranch-listContainer">
        <div className="github-PrSelectionByBranch-message">
          We found {totalCount} pull requests associated
          with a branch named <span className="highlight">{variables.branchName}</span> on the
          repository <span className="highlight">{variables.repoOwner}/{variables.repoName}</span>.
          Select a pull request below to display it, or specify
          any pull request URL to pin it manually:
        </div>
        <div className="github-PrSelectionByBranch-input">
          <PrUrlInputBox onSubmit={this.props.onSelectPr} />
        </div>
        <ul className="github-PrSelectionByBranch-list">
          {edges.map(this.renderPrItem)}
        </ul>
      </div>
    );
  }

  @autobind
  renderPrItem({node}) {
    return (
      <li key={node.id} onClick={e => this.selectPullRequest(e, node)}>
        #{node.number}: {node.title}
      </li>
    );
  }

  @autobind
  toggleInputBoxVisibility() {
    this.setState({displayInputBox: !this.state.displayInputBox});
  }

  @autobind
  setPr(prLink) {
    this.props.onSelectPr(prLink);
  }

  @autobind
  selectPullRequest(event, node) {
    event.preventDefault();
    this.setPr(node.url);
  }

  getDefaultBranchRef() {
    return `refs/heads/${this.props.repository.defaultBranchRef.name}`;
  }

  isDetachedHead() {
    return !this.props.branches.getHeadBranch().isPresent();
  }

  isOnDefaultRef() {
    if (!this.props.repository) { return false; }

    const currentBranch = this.props.branches.getHeadBranch();
    return currentBranch.getPush().getRemoteRef() === this.getDefaultBranchRef();
  }

  isSameAsDefaultRef() {
    if (!this.props.repository) { return false; }

    const currentBranch = this.props.branches.getHeadBranch();
    const mainBranches = this.props.branches.getPushSources(this.props.remote.getName(), this.getDefaultBranchRef());
    return mainBranches.some(branch => branch.getSha() === currentBranch.getSha());
  }

  hasUpstreamBranch() {
    return this.props.branches.getHeadBranch().getUpstream().isPresent();
  }
}

export default createFragmentContainer(PrSelectionByBranch, {
  repository: graphql`
    fragment prSelectionByBranchContainer_repository on Repository {
      defaultBranchRef {
        name
      }

      pullRequests(first: 30, headRefName: $branchName) {
        totalCount
        edges {
          node {
            id number title url
            ...prInfoContainer_pullRequest
          }
        }
      }
    }
  `,
});
