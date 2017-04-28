import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';
import Octicon from '../views/octicon';

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
    onUnpinPr: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {displayInputBox: false};
  }

  render() {
    // TODO: render a selector if multiple PRs
    const repo = this.props.query.repository;
    const {variables} = this.props.relay;
    if (!repo || !repo.pullRequests.edges.length) {
      // return null; // TODO: no PRs
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
        <div>
          <div>
            <div onClick={this.toggleInputBoxVisibility}>
              Specify Pull Request URL to pin
              <Octicon
                title="Click here to select another PR."
                icon="pin"
                className="pinned-by-url"
              />
            </div>
            {this.state.displayInputBox &&
              <PrUrlInputBox onSubmit={this.props.onSelectPr}>
                <p>
                  We found a pull request associated with the branch {variables.branchName} on the
                  repository {variables.repoOwner}/{variables.repoName}.
                </p>
                <p>
                  If you'd like to view a different pull request, specify its GitHub URL and we will pin it to
                  the current branch:
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

  @autobind
  toggleInputBoxVisibility() {
    this.setState({displayInputBox: !this.state.displayInputBox});
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
