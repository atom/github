import React from 'react';
import Relay from 'react-relay';

import IssueishPaneItemContainer from './issueish-pane-item-container';

export class IssueishLookupByNumber extends React.Component {
  static propTypes = {
    query: React.PropTypes.shape({
      repository: React.PropTypes.object,
    }),
    relay: React.PropTypes.shape({
      variables: React.PropTypes.shape({
        prNumber: React.PropTypes.number.isRequired,
      }).isRequired,
    }).isRequired,
  }

  render() {
    const repo = this.props.query.repository;
    if (!repo || !repo.issueish) {
      return <div>Issue/PR #{this.props.relay.variables.prNumber} not found</div>; // TODO: no PRs
    }
    return (
      <IssueishPaneItemContainer repository={repo} issueish={repo.issueish} />
    );
  }
}

export default Relay.createContainer(IssueishLookupByNumber, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    prNumber: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner, name: $repoName) {
          ${IssueishPaneItemContainer.getFragment('repository')}
          issueish(number: $prNumber) {
            ${IssueishPaneItemContainer.getFragment('issueish')}
          }
        }
      }
    `,
  },
});
