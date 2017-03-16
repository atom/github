import React from 'react';
import Relay from 'react-relay';
import {autobind} from 'core-decorators';

import IssueishPaneItemContainer from './issueish-pane-item-container';

export class IssueishLookupByNumber extends React.Component {
  static propTypes = {
    onTitleChange: React.PropTypes.func.isRequired,
    query: React.PropTypes.shape({
      repository: React.PropTypes.object,
    }),
    relay: React.PropTypes.shape({
      setVariables: React.PropTypes.func.isRequired,
      variables: React.PropTypes.shape({
        repoOwner: React.PropTypes.string.isRequired,
        repoName: React.PropTypes.string.isRequired,
        issueishNumber: React.PropTypes.number.isRequired,
      }).isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  updateTitle() {
    const {repository} = this.props.query;
    if (repository && repository.issueish) {
      const {repoOwner, repoName, issueishNumber} = this.props.relay.variables;
      // eslint-disable-next-line no-irregular-whitespace
      let title = `${repoOwner}/${repoName}#${issueishNumber} — ${repository.issueish.title}`;
      if (repository.issueish.__typename === 'Issue') {
        title = 'Issue: ' + title;
      } else {
        title = 'PR: ' + title;
      }
      this.props.onTitleChange(title);
    }
  }

  render() {
    const repo = this.props.query.repository;
    if (!repo || !repo.issueish) {
      return <div>Issue/PR #{this.props.relay.variables.issueishNumber} not found</div>; // TODO: no PRs
    }
    return (
      <IssueishPaneItemContainer repository={repo} issueish={repo.issueish} switchToIssueish={this.switchToIssueish} />
    );
  }

  @autobind
  switchToIssueish(repoOwner, repoName, issueishNumber) {
    this.props.relay.setVariables({repoOwner, repoName, issueishNumber});
  }
}

export default Relay.createContainer(IssueishLookupByNumber, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    issueishNumber: null,
  },

  // TOOD: remove issueish/PR hack once GraphQL is fixed
  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner, name: $repoName) {
          ${IssueishPaneItemContainer.getFragment('repository')}
          issueish:pullRequest(number: $issueishNumber) {
            __typename title
            ${IssueishPaneItemContainer.getFragment('issueish')}
          }
        }
      }
    `,
  },
});
