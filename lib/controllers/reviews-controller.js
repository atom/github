import React from 'react';
import PropTypes from 'prop-types';
import {createFragmentContainer, graphql} from 'react-relay';

import {RemoteSetPropType, BranchSetPropType, EndpointPropType, WorkdirContextPoolPropType} from '../prop-types';
import ReviewsView from '../views/reviews-view';
import PullRequestCheckoutController from '../controllers/pr-checkout-controller';
import addReviewMutation from '../mutations/add-pr-review';
import addReviewCommentMutation from '../mutations/add-pr-review-comment';
import submitReviewMutation from '../mutations/submit-pr-review';
import resolveReviewThreadMutation from '../mutations/resolve-review-thread';
import unresolveReviewThreadMutation from '../mutations/unresolve-review-thread';
import IssueishDetailItem from '../items/issueish-detail-item';

import translateLines, {getLastLineForDiffHunk} from 'whats-my-line';

export class BareReviewsController extends React.Component {
  static propTypes = {
    // Relay results
    relay: PropTypes.shape({
      environment: PropTypes.object.isRequired,
    }).isRequired,
    repository: PropTypes.object.isRequired,
    pullRequest: PropTypes.shape({
      id: PropTypes.string.isRequired,
      headRefOid: PropTypes.string.isRequired,
    }).isRequired,
    viewer: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }).isRequired,

    // Package models
    workdirContextPool: WorkdirContextPoolPropType.isRequired,
    localRepository: PropTypes.object.isRequired,
    isAbsent: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isPresent: PropTypes.bool.isRequired,
    isMerging: PropTypes.bool.isRequired,
    isRebasing: PropTypes.bool.isRequired,
    branches: BranchSetPropType.isRequired,
    remotes: RemoteSetPropType.isRequired,
    multiFilePatch: PropTypes.object.isRequired,
    initCommentID: PropTypes.string,

    // Connection properties
    endpoint: EndpointPropType.isRequired,

    // URL parameters
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    workdir: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      contextLines: 4,
      postingToThreadID: null,
      summarySectionOpen: true,
      commentSectionOpen: true,
      threadIDsOpen: new Set(
        this.props.initCommentID ? [this.props.initCommentID] : [],
      ),
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.initCommentID && this.props.initCommentID !== prevProps.initCommentID) {
      this.showThreadID(this.props.initCommentID);
    }
  }

  render() {
    return (
      <PullRequestCheckoutController
        repository={this.props.repository}
        pullRequest={this.props.pullRequest}

        localRepository={this.props.localRepository}
        isAbsent={this.props.isAbsent}
        isLoading={this.props.isLoading}
        isPresent={this.props.isPresent}
        isMerging={this.props.isMerging}
        isRebasing={this.props.isRebasing}
        branches={this.props.branches}
        remotes={this.props.remotes}>

        {checkoutOp => (
          <ReviewsView
            checkoutOp={checkoutOp}
            contextLines={this.state.contextLines}
            postingToThreadID={this.state.postingToThreadID}
            summarySectionOpen={this.state.summarySectionOpen}
            commentSectionOpen={this.state.commentSectionOpen}
            threadIDsOpen={this.state.threadIDsOpen}
            resolvedThreadsMarkedVisible={this.state.resolvedThreadsMarkedVisible}

            moreContext={this.moreContext}
            lessContext={this.lessContext}
            openFile={this.openFile}
            openDiff={this.openDiff}
            openPR={this.openPR}
            openIssueish={this.openIssueish}
            showSummaries={this.showSummaries}
            hideSummaries={this.hideSummaries}
            showComments={this.showComments}
            hideComments={this.hideComments}
            showThreadID={this.showThreadID}
            hideThreadID={this.hideThreadID}
            resolveThread={this.resolveThread}
            unresolveThread={this.unresolveThread}
            addSingleComment={this.addSingleComment}
            {...this.props}
          />
        )}

      </PullRequestCheckoutController>
    );
  }

  openFile = async (filePath, lineNumber, diffHunk) => {
    const prCommitSha = this.props.pullRequest.headRefOid;

    // const lineNumber = getLastLineForDiffHunk(diffHunk);
    const translations = await translateLines([lineNumber], this.props.workdir, filePath, prCommitSha);

    this.props.workspace.open(
      filePath, {
        initialLine: translations.get(lineNumber).newPosition - 1,
        initialColumn: 0,
        pending: true,
      });
  }

  openDiff = async (filePath, lineNumber) => {
    const item = await this.getPRDetailItem();
    item.openFilesTab({
      changedFilePath: filePath,
      changedFilePosition: lineNumber,
    });
  }

  openPR = async () => {
    const item = await this.getPRDetailItem();
    item.onTabSelected(IssueishDetailItem.tabs.OVERVIEW);
  }

  getPRDetailItem = () => {
    return this.props.workspace.open(
      IssueishDetailItem.buildURI(
        this.props.endpoint.getHost(),
        this.props.owner,
        this.props.repo,
        this.props.number,
        this.props.workdir,
      ), {
        pending: true,
        searchAllPanes: true,
      },
    );
  }

  moreContext = () => this.setState(prev => ({contextLines: prev.contextLines + 1}));

  lessContext = () => this.setState(prev => ({contextLines: Math.max(prev.contextLines - 1, 1)}));

  openIssueish = async (owner, repo, number) => {
    const host = this.props.endpoint.getHost();

    const homeRepository = await this.props.localRepository.hasGitHubRemote(host, owner, repo)
      ? this.props.localRepository
      : (await this.props.workdirContextPool.getMatchingContext(host, owner, repo)).getRepository();

    const uri = IssueishDetailItem.buildURI(host, owner, repo, number, homeRepository.getWorkingDirectoryPath());
    return this.props.workspace.open(uri, {pending: true, searchAllPanes: true});
  }

  showSummaries = () => new Promise(resolve => this.setState({summarySectionOpen: true}, resolve));

  hideSummaries = () => new Promise(resolve => this.setState({summarySectionOpen: false}, resolve));

  showComments = () => new Promise(resolve => this.setState({commentSectionOpen: true}, resolve));

  hideComments = () => new Promise(resolve => this.setState({commentSectionOpen: false}, resolve));

  showThreadID = commentID => new Promise(resolve => this.setState(prev => {
    prev.threadIDsOpen.add(commentID);
    return {};
  }, resolve));

  hideThreadID = commentID => new Promise(resolve => this.setState(prev => {
    prev.threadIDsOpen.delete(commentID);
    return {};
  }, resolve));

  resolveThread = async thread => {
    if (thread.viewerCanResolve) {
      // optimistically hide the thread to avoid jankiness;
      // if the operation fails, the onError callback will revert it.
      this.hideThreadID(thread.id);
      try {
        await resolveReviewThreadMutation(this.props.relay.environment, {
          threadID: thread.id,
          viewerID: this.props.viewer.id,
          viewerLogin: this.props.viewer.login,
        });
      } catch (e) {
        this.showThreadID(thread.id);
      }
    }
  }

  unresolveThread = async thread => {
    if (thread.viewerCanUnresolve) {
      await unresolveReviewThreadMutation(this.props.relay.environment, {
        threadID: thread.id,
        viewerID: this.props.viewer.id,
        viewerLogin: this.props.viewer.login,
      });
    }
  }

  addSingleComment = async (commentBody, threadID, replyToID, callbacks = {}) => {
    try {
      this.setState({postingToThreadID: threadID});

      const reviewResult = await addReviewMutation(this.props.relay.environment, {
        pullRequestID: this.props.pullRequest.id,
        viewerID: this.props.viewer.id,
      });
      const reviewID = reviewResult.addPullRequestReview.reviewEdge.node.id;

      const commentPromise = addReviewCommentMutation(this.props.relay.environment, {
        body: commentBody,
        inReplyTo: replyToID,
        reviewID,
        threadID,
        viewerID: this.props.viewer.id,
      });
      if (callbacks.didSubmitComment) {
        callbacks.didSubmitComment();
      }
      await commentPromise;

      await submitReviewMutation(this.props.relay.environment, {
        event: 'COMMENT',
        reviewID,
      });
    } catch (error) {
      // TODO report mutation error
      // eslint-disable-next-line no-console
      console.error('Mutation error', {
        message: error.message,
        errors: error.errors,
        response: error.response,
        stack: error.stack,
      });
    } finally {
      this.setState({postingToThreadID: null});
    }
  }
}

export default createFragmentContainer(BareReviewsController, {
  viewer: graphql`
    fragment reviewsController_viewer on User {
      id
      login
      avatarUrl
    }
  `,
  repository: graphql`
    fragment reviewsController_repository on Repository {
      ...prCheckoutController_repository
    }
  `,
  pullRequest: graphql`
    fragment reviewsController_pullRequest on PullRequest
    @argumentDefinitions(
      reviewCount: {type: "Int!"}
      reviewCursor: {type: "String"}
      threadCount: {type: "Int!"}
      threadCursor: {type: "String"}
      commentCount: {type: "Int!"}
      commentCursor: {type: "String"}
    ) {
      id
      headRefOid

      ...prCheckoutController_pullRequest
      ...aggregatedReviewsContainer_pullRequest @arguments(
        reviewCount: $reviewCount
        reviewCursor: $reviewCursor
        threadCount: $threadCount
        threadCursor: $threadCursor
        commentCount: $commentCount
        commentCursor: $commentCursor
      )
    }
  `,
});
