import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import {
  BranchSetPropType, RemoteSetPropType, ItemTypePropType, EndpointPropType, RefHolderPropType,
} from '../prop-types';
import IssueDetailView from '../views/issue-detail-view';
import CommitDetailItem from '../items/commit-detail-item';
import ReviewsItem from '../items/reviews-item';
import {addEvent} from '../reporter-proxy';
import PullRequestCheckoutController from './pr-checkout-controller';

export class BareIssueishDetailController extends React.Component {
  static propTypes = {
    // Relay response
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      pullRequest: PropTypes.any,
      issue: PropTypes.any,
    }),
    issueishNumber: PropTypes.number.isRequired,

    // Local Repository model properties
    localRepository: PropTypes.object.isRequired,
    branches: BranchSetPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isRebasing: PropTypes.bool.isRequired,
    isAbsent: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isPresent: PropTypes.bool.isRequired,
    workdirPath: PropTypes.string,

    // Connection information
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    // Action methods
    fetch: PropTypes.func.isRequired,
    checkout: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    addRemote: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,
    refEditor: RefHolderPropType.isRequired,

    // For opening files changed tab
    changedFilePath: PropTypes.string,
    changedFilePosition: PropTypes.number,
    selectedTab: PropTypes.number,
    onTabSelected: PropTypes.func,
  }

  constructor(props) {
    super(props);

    this.state = {
      typename: null,
    };
  }

  //  storing `typename` in state to avoid having to do ugly long chained lookups in several places.
  // note that whether we're rendering an Issue or a PullRequest,
  // relay returns both issue and pull request data.
  // So a pullRequest can have a __typename of `Issue` or `PullRequest`, which is // then set in state here.
  static getDerivedStateFromProps(nextProps, prevState) {
    const {repository} = nextProps;
    const typename = repository && repository.pullRequest &&
     repository.pullRequest.__typename ? repository.pullRequest.__typename : null;
    if (typename && prevState.typename !== typename) {
      return ({typename});
    } else {
      return null;
    }
  }

  componentDidMount() {
    this.updateTitle();
  }

  componentDidUpdate() {
    this.updateTitle();
  }

  updateTitle() {
    const {repository} = this.props;
    if (repository && (repository.issue || repository.pullRequest)) {
      let prefix, issueish;
      if (this.state.typename === 'PullRequest') {
        prefix = 'PR:';
        issueish = repository.pullRequest;
      } else {
        prefix = 'Issue:';
        issueish = repository.issue;
      }
      const title = `${prefix} ${repository.owner.login}/${repository.name}#${issueish.number} — ${issueish.title}`;
      this.props.onTitleChange(title);
    }
  }

  render() {
    const {repository} = this.props;
    if (!repository || !repository.issue || !repository.pullRequest) {
      return <div>Issue/PR #{this.props.issueishNumber} not found</div>; // TODO: no PRs
    }

    if (this.state.typename === 'PullRequest') {
      return (
        <PullRequestCheckoutController
          localRepository={this.props.localRepository}
          repository={repository}
          pullRequest={repository.pullRequest}
          openReviews={this.openReviews}
          switchToIssueish={this.props.switchToIssueish}

          endpoint={this.props.endpoint}
          token={this.props.token}

          workspace={this.props.workspace}
          commands={this.props.commands}
          keymaps={this.props.keymaps}
          tooltips={this.props.tooltips}
          config={this.props.config}

          openCommit={this.openCommit}

          itemType={this.props.itemType}
          destroy={this.props.destroy}
          refEditor={this.props.refEditor}

          changedFilePath={this.props.changedFilePath}
          changedFilePosition={this.props.changedFilePosition}
          selectedTab={this.props.selectedTab}
          childComponentType={'PullRequestDetailView'}
          onTabSelected={this.props.onTabSelected}
          {...this.props}
        />
      );
    } else {
      return (
        <IssueDetailView
          repository={repository}
          issue={repository.issue}
          switchToIssueish={this.props.switchToIssueish}
        />
      );
    }
  }

  openCommit = async ({sha}) => {
    /* istanbul ignore if */
    if (!this.props.workdirPath) {
      return;
    }

    const uri = CommitDetailItem.buildURI(this.props.workdirPath, sha);
    await this.props.workspace.open(uri, {pending: true});
    addEvent('open-commit-in-pane', {package: 'github', from: this.constructor.name});
  }

  openReviews = async () => {
    if (!this.props.workdirPath) {
      return;
    }

    if (this.state.typename !== 'PullRequest') {
      return;
    }

    const uri = ReviewsItem.buildURI(
      this.props.endpoint.getHost(),
      this.props.repository.owner.login,
      this.props.repository.name,
      this.props.issueishNumber,
      this.props.workdirPath,
    );
    await this.props.workspace.open(uri);
    addEvent('open-reviews-tab', {package: 'github', from: this.constructor.name});
  }
}

export default createFragmentContainer(BareIssueishDetailController, {
  repository: graphql`
    fragment issueishDetailController_repository on Repository
    @argumentDefinitions(
      issueishNumber: {type: "Int!"}
      timelineCount: {type: "Int!"}
      timelineCursor: {type: "String"}
      commitCount: {type: "Int!"}
      commitCursor: {type: "String"}
      reviewCount: {type: "Int!"}
      reviewCursor: {type: "String"}
      threadCount: {type: "Int!"}
      threadCursor: {type: "String"}
      commentCount: {type: "Int!"}
      commentCursor: {type: "String"}
    ) {
      ...issueDetailView_repository
      ...prDetailView_repository
      name
      owner {
        login
      }
      issue: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on Issue {
          title
          number
          ...issueDetailView_issue @arguments(
            timelineCount: $timelineCount,
            timelineCursor: $timelineCursor,
          )
        }
      }
      pullRequest: issueOrPullRequest(number: $issueishNumber) {
        __typename
        ... on PullRequest {
          title
          number
          headRefName
          headRepository {
            name
            owner {
              login
            }
            url
            sshUrl
          }
          ...prDetailView_pullRequest @arguments(
            timelineCount: $timelineCount
            timelineCursor: $timelineCursor
            commitCount: $commitCount
            commitCursor: $commitCursor
            reviewCount: $reviewCount
            reviewCursor: $reviewCursor
            threadCount: $threadCount
            threadCursor: $threadCursor
            commentCount: $commentCount
            commentCursor: $commentCursor
          )
        }
      }
    }
  `,
});
