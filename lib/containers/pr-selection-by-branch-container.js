import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';

export class PrSelectionByBranch extends React.Component {
  static propTypes = {
    query: PropTypes.shape({
      repository: PropTypes.shape({
        pullRequests: PropTypes.shape({
          totalCount: PropTypes.number,
        }),
      }),
    }),
    relay: PropTypes.shape({
      variables: PropTypes.object,
    }),
    onSelectPr: PropTypes.func.isRequired,
  }

  render() {
    // TODO: render a selector if multiple PRs
    const repo = this.props.query.repository;
    if (!repo || !repo.pullRequests.edges.length) {
      // return null; // TODO: no PRs
      const {variables} = this.props.relay;
      return (
        <div className="github-PrUrlInputBox-Container">
          <PrUrlInputBox onSubmit={this.props.onSelectPr}>
            <p>
              We're sorry, but we couldn't find a pull request associated with
              the branch {variables.branchName} on the
              repository {variables.repoOwner}/{variables.repoName}.
            </p>
            <p>
              Specify a GitHub URL for the pull request that is associated with
              the current branch:
            </p>
          </PrUrlInputBox>
        </div>
      );
    }

    const edges = repo.pullRequests.edges;
    if (edges.length === 1) {
      return (
        <PrInfoContainer pullRequest={edges[0].node} />
      );
    }

    return this.renderPrSelectionList(edges, repo.pullRequests.totalCount);
  }

  renderPrSelectionList(edges, totalCount) {
    const {variables} = this.props.relay;
    return (
      <div>
        <div>
          We found {totalCount} pull requests associated
          with a branch named {variables.branchName} on the
          repository {variables.repoOwner}/{variables.repoName}.
          Select a pull request below to display it, or specify
          your own pull request URL here:
        </div>
        <PrUrlInputBox onSubmit={this.props.onSelectPr} />
        <ul>
          {edges.map(this.displayPullRequestItem)}
        </ul>
      </div>
    );
  }

  @autobind
  displayPullRequestItem({node}) {
    return (
      <li key={node.id} onClick={e => this.selectPullRequest(e, node)}>
        #{node.number}: {node.title}
      </li>
    );
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
}

export default Relay.createContainer(PrSelectionByBranch, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    branchName: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner, name: $repoName) {
          pullRequests(first: 30, headRefName: $branchName) {
            totalCount
            edges {
              node {
                id number title url
                ${PrInfoContainer.getFragment('pullRequest')}
              }
            }
          }
        }
      }
    `,
  },
});
