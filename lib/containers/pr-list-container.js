import React from 'react';
import Relay from 'react-relay';

import PrInfoContainer from './pr-info-container';

export class PrList extends React.Component {
  static propTypes = {
    query: React.PropTypes.shape({
      repository: React.PropTypes.object,
    }),
  }

  render() {
    const repo = this.props.query.repository;
    if (!repo.pullRequests.edges.length) {
      return null; // TODO: no PRs
    }
    const pr = repo.pullRequests.edges[0].node;
    return (
      <PrInfoContainer pullRequest={pr} />
    );
  }
}

export default Relay.createContainer(PrList, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    branchName: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner, name: $repoName) {
          pullRequests(first: 30, headRefName: [$branchName]) {
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
