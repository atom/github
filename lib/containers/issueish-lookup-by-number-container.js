import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import IssueishPaneItemContainer from './issueish-pane-item-container';

export class IssueishLookupByNumber extends React.Component {
  static propTypes = {
    onTitleChange: PropTypes.func.isRequired,
    query: PropTypes.shape({
      repository: PropTypes.object,
    }),
    relay: PropTypes.shape({
      setVariables: PropTypes.func.isRequired,
      variables: PropTypes.shape({
        repoOwner: PropTypes.string.isRequired,
        repoName: PropTypes.string.isRequired,
        issueishNumber: PropTypes.number.isRequired,
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
          issueish:issueOrPullRequest(number: $issueishNumber) {
            __typename
            ... on Issue {
              title
              ${IssueishPaneItemContainer.getFragment('issueish')}
            }
            ... on PullRequest {
              title
              ${IssueishPaneItemContainer.getFragment('issueish')}
            }
          }
        }
      }
    `,
  },
});
