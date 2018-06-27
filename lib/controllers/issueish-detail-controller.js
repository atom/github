import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import IssueishPaneItemContainer from '../containers/issueish-pane-item-container';

export class BareIssueishDetailController extends React.Component {
  static propTypes = {
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      issueish: PropTypes.any, // FIXME from IssueishPaneItemContainer.propTypes
    }),
    issueishNumber: PropTypes.number.isRequired,

    onTitleChange: PropTypes.func.isRequired,
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
      const prefix = issueish.__typename === 'Issue' ? 'Issue:' : 'PR:';

      const title = `${prefix} ${repository.owner.login}/${repository.name}#${issueish.number} — ${issueish.title}`;
      this.props.onTitleChange(title);
    }
  }

  render() {
    const {repository} = this.props;
    if (!repository || !repository.issueish) {
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }

    return (
      <IssueishPaneItemContainer
        repository={repository}
        issueish={repository.issueish}
        switchToIssueish={this.props.switchToIssueish}
      />
    );
  }
}

export default createFragmentContainer(BareIssueishDetailController, {
  repository: graphql`
    fragment issueishDetailController_repository on Repository
    @argumentDefinitions(
      timelineCount: {type: "Int"},
      timelineCursor: {type: "String"},
      issueishNumber: {type: "Int!"}
    ) {
      ...issueishPaneItemContainer_repository
      name
      owner {
        login
      }
      issueish: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on Issue {
          title number
          ...issueishPaneItemContainer_issueish @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor
          )
        }
        ... on PullRequest {
          title number
          ...issueishPaneItemContainer_issueish @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor
          )
        }
      }
    }
  `,
});
