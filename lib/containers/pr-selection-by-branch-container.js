import React from 'react';
import Relay from 'react-relay/classic';
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
    return (
      <div className="github-PrSelectionByBranch">
        {this.renderSubview()}
      </div>
    );
  }

  renderSubview() {
    const repo = this.props.query.repository;
    const {variables} = this.props.relay;
    if (!repo || !repo.pullRequests.edges.length) {
      return (
        <div className="github-PrUrlInputBox-Container">
          <PrUrlInputBox onSubmit={this.props.onSelectPr}>
            <p className="icon icon-git-pull-request" />
            <p>
              No pull request could be found for the branch <span className="highlight">{variables.branchName}</span>
              on the repository <span className="highlight">{variables.repoOwner}/{variables.repoName}</span>.
            </p>
            <p>
              You can manually pin a GitHub pull request to the current branch by entering its URL:
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

  @autobind
  toggleInputBoxVisibility() {
    this.setState({displayInputBox: !this.state.displayInputBox});
  }

  renderPrSelectionList(edges, totalCount) {
    const {variables} = this.props.relay;
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
