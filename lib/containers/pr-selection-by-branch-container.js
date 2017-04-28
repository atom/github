import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

import PrInfoContainer from './pr-info-container';
import PrUrlInputBox from '../views/pr-url-input-box';

export class PrSelectionByBranch extends React.Component {
  static propTypes = {
    query: PropTypes.shape({
      repository: PropTypes.object,
    }),
    onSelectPr: PropTypes.func.isRequired,
  }

  render() {
    // TODO: render a selector if multiple PRs
    const repo = this.props.query.repository;
    if (!repo || !repo.pullRequests.edges.length) {
      // return null; // TODO: no PRs
      return (
        <PrUrlInputBox onSubmit={this.props.onSelectPr} />
      );
    }
    const pr = repo.pullRequests.edges[0].node;
    return (
      <PrInfoContainer pullRequest={pr} />
    );
  }

  setPr(prLink) {
    this.props.onSelectPr(prLink);
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
            edges {
              node {
                ${PrInfoContainer.getFragment('pullRequest')}
              }
            }
          }
        }
      }
    `,
  },
});
