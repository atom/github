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
import PullRequestDetailView from '../views/pr-detail-view';

export class BareIssueishDetailController extends React.Component {
  static propTypes = {
    // Relay response
    relay: PropTypes.object.isRequired,
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      pullRequest: PropTypes.any,
      issue: PropTypes.any,
    }),

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
    issueishNumber: PropTypes.number.isRequired,

    // Review comment threads
    reviewCommentsLoading: PropTypes.bool.isRequired,
    reviewCommentsTotalCount: PropTypes.number.isRequired,
    reviewCommentsResolvedCount: PropTypes.number.isRequired,
    reviewCommentThreads: PropTypes.arrayOf(PropTypes.shape({
      thread: PropTypes.object.isRequired,
      comments: PropTypes.arrayOf(PropTypes.object).isRequired,
    })),

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
    onTitleChange: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,
    refEditor: RefHolderPropType.isRequired,

    // For opening files changed tab
    initChangedFilePath: PropTypes.string,
    initChangedFilePosition: PropTypes.number,
    selectedTab: PropTypes.number.isRequired,
    onTabSelected: PropTypes.func.isRequired,
    onOpenFilesTab: PropTypes.func.isRequired,
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
      // todo: clean up the props that we are passing here omg
      return (
        <PullRequestCheckoutController
          repository={repository}
          pullRequest={repository.pullRequest}

          localRepository={this.props.localRepository}
          isAbsent={this.props.isAbsent}
          isLoading={this.props.isLoading}
          isPresent={this.props.isPresent}
          isMerging={this.props.isMerging}
          isRebasing={this.props.isRebasing}
          branches={this.props.branches}
          remotes={this.props.remotes}>

          {checkoutOp => (
            <PullRequestDetailView
              relay={this.props.relay}
              repository={this.props.repository}
              pullRequest={this.props.repository.pullRequest}

              checkoutOp={checkoutOp}
              localRepository={this.props.localRepository}

              reviewCommentsLoading={this.props.reviewCommentsLoading}
              reviewCommentsTotalCount={this.props.reviewCommentsTotalCount}
              reviewCommentsResolvedCount={this.props.reviewCommentsResolvedCount}
              reviewCommentThreads={this.props.reviewCommentThreads}

              endpoint={this.props.endpoint}
              token={this.props.token}

              workspace={this.props.workspace}
              commands={this.props.commands}
              keymaps={this.props.keymaps}
              tooltips={this.props.tooltips}
              config={this.props.config}

              openCommit={this.openCommit}
              openReviews={this.openReviews}
              switchToIssueish={this.props.switchToIssueish}
              destroy={this.props.destroy}

              itemType={this.props.itemType}
              refEditor={this.props.refEditor}

              initChangedFilePath={this.props.initChangedFilePath}
              initChangedFilePosition={this.props.initChangedFilePosition}
              selectedTab={this.props.selectedTab}
              onTabSelected={this.props.onTabSelected}
              onOpenFilesTab={this.props.onOpenFilesTab}
            />
          )}

        </PullRequestCheckoutController>
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
    ) {
      ...issueDetailView_repository
      ...prCheckoutController_repository
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
          ...prCheckoutController_pullRequest
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
