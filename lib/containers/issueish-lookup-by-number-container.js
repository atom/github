import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay/compat';
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
      refetch: PropTypes.func.isRequired,
    }).isRequired,
    issueishNumber: PropTypes.number.isRequired,
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
      const issueish = repository.issueish;
      // eslint-disable-next-line no-irregular-whitespace
      let title = `${repository.owner.login}/${repository.name}#${issueish.number} — ${issueish.title}`;
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
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }
    return (
      <IssueishPaneItemContainer repository={repo} issueish={repo.issueish} switchToIssueish={this.switchToIssueish} />
    );
  }

  @autobind
  switchToIssueish(repoOwner, repoName, issueishNumber) {
    this.props.relay.refetch({repoOwner, repoName, issueishNumber}, null);
  }
}

export default createRefetchContainer(IssueishLookupByNumber, {
  // TOOD: remove issueish/PR hack once GraphQL is fixed
  query: graphql`
    fragment IssueishLookupByNumberContainer on Query {
      repository(owner: $repoOwner, name: $repoName) {
        ...IssueishPaneItemContainer_repository
        name owner { login }
        issueish:issueOrPullRequest(number: $issueishNumber) {
          __typename
          ... on Issue {
            title
            ...IssueishPaneItemContainer_issueish
          }
          ... on PullRequest {
            title
            ...IssueishPaneItemContainer_issueish
          }
        }
      }
    }
  `,
});
