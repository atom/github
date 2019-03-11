import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';

import {EnableableOperationPropType, ItemTypePropType, EndpointPropType, RefHolderPropType} from '../prop-types';
import {addEvent} from '../reporter-proxy';
import PeriodicRefresher from '../periodic-refresher';
import Octicon from '../atom/octicon';
import PullRequestChangedFilesContainer from '../containers/pr-changed-files-container';
import {checkoutStates} from '../controllers/pr-checkout-controller';
import PrTimelineContainer from '../controllers/pr-timeline-controller';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import EmojiReactionsView from '../views/emoji-reactions-view';
import IssueishBadge from '../views/issueish-badge';
import PrCommitsView from '../views/pr-commits-view';
import PrStatusesView from '../views/pr-statuses-view';
import ReviewsFooterView from '../views/reviews-footer-view';
import {PAGE_SIZE} from '../helpers';


export class BarePullRequestDetailView extends React.Component {
  static propTypes = {
    // Relay response
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }),
    selectedTab: PropTypes.number,
    openReviews: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    checkoutOp: EnableableOperationPropType.isRequired,
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string,
      }),
    }),
    pullRequest: PropTypes.shape({
      __typename: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      countedCommits: PropTypes.shape({
        totalCount: PropTypes.number.isRequired,
      }).isRequired,
      isCrossRepository: PropTypes.bool,
      changedFiles: PropTypes.number.isRequired,
      url: PropTypes.string.isRequired,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      state: PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
      ]).isRequired,
      author: PropTypes.shape({
        login: PropTypes.string.isRequired,
        avatarUrl: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      }).isRequired,
      reactionGroups: PropTypes.arrayOf(
        PropTypes.shape({
          content: PropTypes.string.isRequired,
          users: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
          }).isRequired,
        }),
      ).isRequired,
    }).isRequired,

    // Local model objects
    localRepository: PropTypes.object.isRequired,

    // Connection information
    endpoint: EndpointPropType.isRequired,
    token: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    // Action functions
    openCommit: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,

    // Item context
    itemType: ItemTypePropType.isRequired,
    refEditor: RefHolderPropType.isRequired,

    // For opening files changed tab
    changedFilePath: PropTypes.string,
    changedFilePosition: PropTypes.number,
    onOpenFilesTab: PropTypes.func.isRequired,
  }

  state = {
    refreshing: false,
  }

  componentDidMount() {
    this.refresher = new PeriodicRefresher(BarePullRequestDetailView, {
      interval: () => 5 * 60 * 1000,
      getCurrentId: () => this.props.pullRequest.id,
      refresh: this.refresh,
      minimumIntervalPerId: 2 * 60 * 1000,
    });
    // auto-refresh disabled for now until pagination is handled
    // this.refresher.start();
  }

  componentWillUnmount() {
    this.refresher.destroy();
  }

  renderPrMetadata(pullRequest, repo) {
    return (
      <span className="github-IssueishDetailView-meta">
        <code className="github-IssueishDetailView-baseRefName">{pullRequest.isCrossRepository ?
          `${repo.owner.login}/${pullRequest.baseRefName}` : pullRequest.baseRefName}</code>{' ‹ '}
        <code className="github-IssueishDetailView-headRefName">{pullRequest.isCrossRepository ?
          `${pullRequest.author.login}/${pullRequest.headRefName}` : pullRequest.headRefName}</code>
      </span>
    );
  }

  renderPullRequestBody(pullRequest) {
    const onBranch = this.props.checkoutOp.why() === checkoutStates.CURRENT;

    return (
      <Tabs selectedIndex={this.props.selectedTab} onSelect={this.onTabSelected}>
        <TabList className="github-IssueishDetailView-tablist">
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="info" className="github-IssueishDetailView-tab-icon" />Overview</Tab>
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="checklist" className="github-IssueishDetailView-tab-icon" />
            Build Status
          </Tab>
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="git-commit"
              className="github-IssueishDetailView-tab-icon"
            />
              Commits
            <span className="github-IssueishDetailView-tab-count">{pullRequest.countedCommits.totalCount}</span>
          </Tab>
          <Tab className="github-IssueishDetailView-tab">
            <Octicon icon="diff"
              className="github-IssueishDetailView-tab-icon"
            />
              Files<span className="github-IssueishDetailView-tab-count">{pullRequest.changedFiles}</span>
          </Tab>
        </TabList>
        {/* 'Reviews' tab to be added in the future. */}

        {/* overview */}
        <TabPanel>
          <div className="github-IssueishDetailView-overview">
            <GithubDotcomMarkdown
              html={pullRequest.bodyHTML || '<em>No description provided.</em>'}
              switchToIssueish={this.props.switchToIssueish}
            />
            <EmojiReactionsView reactionGroups={pullRequest.reactionGroups} />
            <PrTimelineContainer
              onBranch={onBranch}
              openCommit={this.props.openCommit}
              pullRequest={pullRequest}
              switchToIssueish={this.props.switchToIssueish}
            />
          </div>
        </TabPanel>

        {/* build status */}
        <TabPanel>
          <div className="github-IssueishDetailView-buildStatus">
            <PrStatusesView pullRequest={pullRequest} displayType="full" />
          </div>
        </TabPanel>

        {/* commits */}
        <TabPanel>
          <PrCommitsView pullRequest={pullRequest} onBranch={onBranch} openCommit={this.props.openCommit} />
        </TabPanel>

        {/* files changed */}
        <TabPanel className="github-IssueishDetailView-filesChanged">
          <PullRequestChangedFilesContainer
            localRepository={this.props.localRepository}

            owner={this.props.repository.owner.login}
            repo={this.props.repository.name}
            number={pullRequest.number}

            endpoint={this.props.endpoint}
            token={this.props.token}

            workspace={this.props.workspace}
            commands={this.props.commands}
            keymaps={this.props.keymaps}
            tooltips={this.props.tooltips}
            config={this.props.config}

            itemType={this.props.itemType}
            refEditor={this.props.refEditor}
            destroy={this.props.destroy}

            shouldRefetch={this.state.refreshing}
            switchToIssueish={this.props.switchToIssueish}

            pullRequest={this.props.pullRequest}

            changedFilePath={this.props.changedFilePath}
            changedFilePosition={this.props.changedFilePosition}
            onOpenFilesTab={this.props.onOpenFilesTab}
          />
        </TabPanel>
      </Tabs>
    );
  }

  render() {
    const repo = this.props.repository;
    const pullRequest = this.props.pullRequest;

    return (
      <div className="github-IssueishDetailView native-key-bindings">
        <div className="github-IssueishDetailView-container">

          <header className="github-IssueishDetailView-header">
            <div className="github-IssueishDetailView-headerColumn">
              <a className="github-IssueishDetailView-avatar" href={pullRequest.author.url}>
                <img className="github-IssueishDetailView-avatarImage"
                  src={pullRequest.author.avatarUrl}
                  title={pullRequest.author.login}
                  alt={pullRequest.author.login}
                />
              </a>
            </div>

            <div className="github-IssueishDetailView-headerColumn is-flexible">
              <div className="github-IssueishDetailView-headerRow is-fullwidth">
                <a className="github-IssueishDetailView-title" href={pullRequest.url}>{pullRequest.title}</a>
              </div>
              <div className="github-IssueishDetailView-headerRow">
                <IssueishBadge className="github-IssueishDetailView-headerBadge"
                  type={pullRequest.__typename}
                  state={pullRequest.state}
                />
                <Octicon
                  icon="repo-sync"
                  className={cx('github-IssueishDetailView-headerRefreshButton', {refreshing: this.state.refreshing})}
                  onClick={this.handleRefreshClick}
                />
                <a className="github-IssueishDetailView-headerLink"
                  title="open on GitHub.com"
                  href={pullRequest.url} onClick={this.recordOpenInBrowserEvent}>
                  {repo.owner.login}/{repo.name}#{pullRequest.number}
                </a>
                <span className="github-IssueishDetailView-headerStatus">
                  <PrStatusesView pullRequest={pullRequest} displayType="check" />
                </span>
              </div>
              <div className="github-IssueishDetailView-headerRow">
                {this.renderPrMetadata(pullRequest, repo)}
              </div>
            </div>

            <div className="github-IssueishDetailView-headerColumn">
              {this.renderCheckoutButton()}
            </div>
          </header>

          {this.renderPullRequestBody(pullRequest)}

          <ReviewsFooterView
            commentsResolved={1}
            totalComments={7}
            openReviews={this.props.openReviews}
            pullRequestURL={this.props.pullRequest.url}
          />
        </div>
      </div>
    );
  }

  renderCheckoutButton() {
    const {checkoutOp} = this.props;
    let extraClass = null;
    let buttonText = 'Checkout';
    let buttonTitle = null;

    if (!checkoutOp.isEnabled()) {
      buttonTitle = checkoutOp.getMessage();
      const reason = checkoutOp.why();
      if (reason === checkoutStates.HIDDEN) {
        return null;
      }

      buttonText = reason.when({
        current: 'Checked out',
        default: 'Checkout',
      });

      extraClass = 'github-IssueishDetailView-checkoutButton--' + reason.when({
        disabled: 'disabled',
        busy: 'busy',
        current: 'current',
      });
    }

    const classNames = cx('btn', 'btn-primary', 'github-IssueishDetailView-checkoutButton', extraClass);
    return (
      <button
        className={classNames}
        disabled={!checkoutOp.isEnabled()}
        title={buttonTitle}
        onClick={() => checkoutOp.run()}>
        {buttonText}
      </button>
    );
  }

  handleRefreshClick = e => {
    e.preventDefault();
    this.refresher.refreshNow(true);
  }

  recordOpenInBrowserEvent = () => {
    addEvent('open-pull-request-in-browser', {package: 'github', component: this.constructor.name});
  }

  onTabSelected = index => {
    this.props.onTabSelected(index);
    const eventName = [
      'open-pr-tab-overview',
      'open-pr-tab-build-status',
      'open-pr-tab-commits',
      'open-pr-tab-files-changed',
    ][index];
    addEvent(eventName, {package: 'github', component: this.constructor.name});
  }

  refresh = () => {
    if (this.state.refreshing) {
      return;
    }

    this.setState({refreshing: true});
    this.props.relay.refetch({
      repoId: this.props.repository.id,
      issueishId: this.props.pullRequest.id,
      timelineCount: PAGE_SIZE,
      timelineCursor: null,
      commitCount: PAGE_SIZE,
      commitCursor: null,
      reviewCount: PAGE_SIZE,
      reviewCursor: null,
      commentCount: PAGE_SIZE,
      commentCursor: null,
    }, null, () => {
      this.setState({refreshing: false});
    }, {force: true});
  }
}

export default createRefetchContainer(BarePullRequestDetailView, {
  repository: graphql`
    fragment prDetailView_repository on Repository {
      id
      name
      owner {
        login
      }
    }
  `,

  pullRequest: graphql`
    fragment prDetailView_pullRequest on PullRequest
    @argumentDefinitions(
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
      __typename

      ... on Node {
        id
      }

      ... on PullRequest {
        isCrossRepository
        changedFiles

        ...aggregatedReviewsContainer_pullRequest @arguments(
          reviewCount: $reviewCount
          reviewCursor: $reviewCursor
          threadCount: $threadCount
          threadCursor: $threadCursor
          commentCount: $commentCount
          commentCursor: $commentCursor
        )

        ...prCommitsView_pullRequest @arguments(commitCount: $commitCount, commitCursor: $commitCursor)
        countedCommits: commits {
          totalCount
        }
        ...prStatusesView_pullRequest
        state number title bodyHTML baseRefName headRefName
        author {
          login avatarUrl
          ... on User { url }
          ... on Bot { url }
        }

        ...prTimelineController_pullRequest @arguments(timelineCount: $timelineCount, timelineCursor: $timelineCursor)
      }

      ... on UniformResourceLocatable { url }

      ... on Reactable {
        reactionGroups {
          content users { totalCount }
        }
      }
    }
  `,
}, graphql`
  query prDetailViewRefetchQuery
  (
    $repoId: ID!
    $issueishId: ID!
    $timelineCount: Int!
    $timelineCursor: String
    $commitCount: Int!
    $commitCursor: String
    $reviewCount: Int!
    $reviewCursor: String
    $threadCount: Int!
    $threadCursor: String
    $commentCount: Int!
    $commentCursor: String
  ) {
    repository: node(id: $repoId) {
      ...prDetailView_repository @arguments(
        timelineCount: $timelineCount
        timelineCursor: $timelineCursor
      )
    }

    pullRequest: node(id: $issueishId) {
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
`);
