import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import IssueishPaneItemContainer from './issueish-pane-item-container';

export class IssueishLookupByNumber extends React.Component {
  static propTypes = {
    onTitleChange: PropTypes.func.isRequired,
    repository: PropTypes.object,
    issueishNumber: PropTypes.number.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
  }

  componentDidMount() {
    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  updateTitle() {
    const {repository} = this.props;
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
    const repo = this.props.repository;
    if (!repo || !repo.issueish) {
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }
    return (
      <IssueishPaneItemContainer
        repository={repo}
        issueish={repo.issueish}
        switchToIssueish={this.props.switchToIssueish}
      />
    );
  }
}

export default createFragmentContainer(IssueishLookupByNumber, {
  repository: graphql`
    fragment IssueishLookupByNumberContainer_repository on Repository {
      ...IssueishPaneItemContainer_repository
      name owner { login }
      issueish:issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on Issue {
          title number
          ...IssueishPaneItemContainer_issueish
        }
        ... on PullRequest {
          title number
          ...IssueishPaneItemContainer_issueish
        }
      }
    }
  `,
});
