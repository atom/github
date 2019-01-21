import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';

import {EnableableOperationPropType, ItemTypePropType, EndpointPropType} from '../prop-types';
import {addEvent} from '../reporter-proxy';
import PeriodicRefresher from '../periodic-refresher';
import Octicon from '../atom/octicon';
import PullRequestChangedFilesContainer from '../containers/pr-changed-files-container';
import PrTimelineContainer from '../controllers/pr-timeline-controller';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import EmojiReactionsView from '../views/emoji-reactions-view';
import IssueishBadge from '../views/issueish-badge';
import PrCommitsView from '../views/pr-commits-view';
import PrStatusesView from '../views/pr-statuses-view';
import {PAGE_SIZE} from '../helpers';

class CheckoutState {
  constructor(name) {
    this.name = name;
  }

  when(cases) {
    return cases[this.name] || cases.default;
  }
}

export const checkoutStates = {
  HIDDEN: new CheckoutState('hidden'),
  DISABLED: new CheckoutState('disabled'),
  BUSY: new CheckoutState('busy'),
  CURRENT: new CheckoutState('current'),
};

export class BarePullRequestDetailView extends React.Component {
  static propTypes = {
    // Relay response
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }),
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
      <Tabs onSelect={this.recordOpenTabEvent}>
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

          <details className="github-Reviews">
            <summary className="github-Reviews-header">
              <h1 className="github-Reviews-title">Review summaries</h1>
            </summary>
            <main className="github-Reviews-container">

              <div className="github-Review">
                <header className="github-Review-header">
                  <span className="github-Review-icon icon icon-alert"></span>
                  <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                  <span className="github-Review-type">recommended changes <span className="github-Review-timeAgo">2 days ago</span></span>
                </header>

                <div className="github-Review-summary is-requesting-changes">
                  I have a minor suggestion, otherwise this seems good to merge.
                </div>

                <details className="github-Review-threads">
                  <summary className="github-Review-threadsHeader">
                    <span className="github-Reviews-threadsHeaderTitle">Comments</span>
                    <span className="github-Reviews-progress">
                      <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">2</span> of <span className="github-Reviews-countNr">3</span></span>
                      <progress class='github-Reviews-progessBar' value='2' max='3'></progress>
                    </span>
                  </summary>

                  <details className="github-Review-thread" open>
                    <summary className="github-Review-threadHeader">
                      <span className="github-Review-path">lib/repository-states/</span>
                      <span className="github-Review-file">present.js</span>
                      <span className="github-Review-line">350</span>
                      <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' />Resolved</label>
                    </summary>
                    <main className="github-Review-comments">
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                        <span className="github-Review-commentText">Mind adding a space after the comma?</span>
                        <span className="github-Review-timeAgo">4 hours ago</span>
                      </div>
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                        <span className="github-Review-commentText">Thanks, right.</span>
                        <span className="github-Review-timeAgo">1 minute ago</span>
                      </div>
                      <div className="github-Review-reply">
                        <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                        <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                        <button className="github-Review-button github-Review-commentButton btn" title="Add your comment">Comment</button>
                      </div>
                    </main>
                  </details>

                  <details className="github-Review-thread">
                    <summary className="github-Review-threadHeader">
                      <span className="github-Review-path">lib/repository-states/</span>
                      <span className="github-Review-file">present.js</span>
                      <span className="github-Review-line">350</span>
                      <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox'  checked="true" />Resolved</label>
                    </summary>
                    <main className="github-Review-comments">
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                        <span className="github-Review-commentText">Great solution! 🤘</span>
                        <span className="github-Review-timeAgo">3 days ago</span>
                      </div>
                    </main>
                  </details>

                  <details className="github-Review-thread">
                    <summary className="github-Review-threadHeader">
                      <span className="github-Review-path">/</span>
                      <span className="github-Review-file">package.json</span>
                      <span className="github-Review-line">4</span>
                      <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' checked="true" />Resolved</label>
                    </summary>
                    <main className="github-Review-comments">
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                        <span className="github-Review-commentText">I think we should only release this as a patch.</span>
                        <span className="github-Review-timeAgo">4 days ago</span>
                      </div>
                    </main>
                  </details>

                </details>

              </div>


              <div className="github-Review">
                <header className="github-Review-header">
                  <span className="github-Review-icon icon icon-comment"></span>
                  <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                  <span className="github-Review-type">left review comments <span className="github-Review-timeAgo">2 days ago</span></span>
                </header>

                <details className="github-Review-threads">
                  <summary className="github-Review-threadsHeader">
                    <span className="github-Review-threadsHeaderTitle">Comments</span>
                    <span className="github-Reviews-progress">
                      <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">1</span> of <span className="github-Reviews-countNr">2</span></span>
                      <progress class='github-Reviews-progessBar' value='1' max='2'></progress>
                    </span>
                  </summary>

                  <details className="github-Review-thread" open>
                    <summary className="github-Review-threadHeader">
                      <span className="github-Review-path">lib/views/</span>
                      <span className="github-Review-file">commit-detail-view.js</span>
                      <span className="github-Review-line">238</span>
                      <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' />Resolved</label>
                    </summary>
                    <main className="github-Review-comments">
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                        <span className="github-Review-commentText">Should we fix <code>ABCMeta.__module__</code> to <code>abc</code>?</span>
                        <span className="github-Review-timeAgo">4 hours ago</span>
                      </div>
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                        <span className="github-Review-commentText">Actually I am not sure. I think it is important for pickling the metaclass itself. But pickle can already find the correct class at <code>_py_abc.ABCMeta</code>. Also it is informative for a quick check which version is used, the C one or the Python one. So this is up to you.?</span>
                        <span className="github-Review-timeAgo">3 hours ago</span>
                      </div>
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/07.png"/>
                        <span className="github-Review-commentText">If pickle <code>abc.ABCMeta</code> as <code>_py_abc.ABCMeta</code> it will be not unpickleable in <code>3.6</code>. Or in future Python versions if we will decide to remove or rename <code>_py_abc</code>.</span>
                        <span className="github-Review-timeAgo">6 minutes ago</span>
                      </div>
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                        <span className="github-Review-commentText">For now we decided that if the active repository is removed from the project, we will set the active repository to be <code>null</code> rather than iterating through the project to find another repository to set as active. We may opt to change this and fall through to another active repository when we have built out more UI to indicate which project folder is the active repository. For now the only indication is the active pane item and since the active pane item no longer belongs to a folder in the project, there is no valid git repo associated with it and we set the active repository to be <code>null</code>.</span>
                        <span className="github-Review-timeAgo">6 minutes ago</span>
                      </div>
                      <div className="github-Review-reply">
                        <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                        <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                        <button className="github-Review-button github-Review-commentButton btn" title="Add your comment">Comment</button>
                      </div>
                    </main>
                  </details>

                  <details className="github-Review-thread">
                    <summary className="github-Review-threadHeader">
                      <span className="github-Review-path">lib/controllers/</span>
                      <span className="github-Review-file">commit-detail-controller.js</span>
                      <span className="github-Review-line">26</span>
                      <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' checked="true" />Resolved</label>
                    </summary>
                    <main className="github-Review-comments">
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                        <span className="github-Review-commentText">Why not use just a plain 64-bit integer?</span>
                        <span className="github-Review-timeAgo">4 days ago</span>
                      </div>
                      <div className="github-Review-comment">
                        <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                        <span className="github-Review-commentText">Hm, good point, I was worried about some ORMs that register lots of classes, but I just calculated that it will take million years to reach the maximum value even if 1000 classes are registered every second.</span>
                        <span className="github-Review-timeAgo">4 days ago</span>
                      </div>
                    </main>
                  </details>

                </details>

              </div>


              <div className="github-Review">
                <header className="github-Review-header">
                  <span className="github-Review-icon icon icon-check"></span>
                  <img className="github-Review-avatar" src="../../github/img/avatars/12.png"/>
                  <span className="github-Review-type">approved these changes <span className="github-Review-timeAgo">4 days ago</span></span>
                </header>
                <div className="github-Review-summary is-approved">
                  Looks good! Ship it!
                </div>
              </div>

            </main>
          </details>

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
            destroy={this.props.destroy}

            shouldRefetch={this.state.refreshing}
            switchToIssueish={this.props.switchToIssueish}

            pullRequest={this.props.pullRequest}
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

          <footer className="github-PrDetailView-footer">
            <h1 className="github-PrDetailView-footerTitle">Reviews</h1>
            <span className="github-PrDetailViewReviews">
              <span className="github-PrDetailViewReviews-count">Resolved <span className="github-PrDetailViewReviews-countNr">3</span> of <span className="github-Reviews-countNr">5</span></span>
              <progress class='github-PrDetailViewReviews-progessBar' value='3' max='5'></progress>
            </span>
            <button className="github-PrDetailViewReviews-openReviewsButton btn">Open reviews</button>
            <button className="github-PrDetailView-reviewChangesButton btn btn-primary">Review changes</button>
          </footer>

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

  recordOpenTabEvent = ind => {
    const eventName = [
      'open-pr-tab-overview',
      'open-pr-tab-build-status',
      'open-pr-tab-commits',
      'open-pr-tab-files-changed',
    ][ind];
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
      timelineCount: {type: "Int!"},
      timelineCursor: {type: "String"},
      commitCount: {type: "Int!"},
      commitCursor: {type: "String"},
      reviewCount: {type: "Int!"},
      reviewCursor: {type: "String"},
      commentCount: {type: "Int!"},
      commentCursor: {type: "String"},
    ) {
      __typename

      ... on Node {
        id
      }

      ... on PullRequest {
        isCrossRepository
        changedFiles

        ...prReviewsContainer_pullRequest @arguments(
          reviewCount: $reviewCount,
          reviewCursor: $reviewCursor,
          commentCount: $commentCount,
          commentCursor: $commentCursor,
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
    $repoId: ID!,
    $issueishId: ID!,
    $timelineCount: Int!,
    $timelineCursor: String,
    $commitCount: Int!,
    $commitCursor: String,
    $reviewCount: Int!,
    $reviewCursor: String,
    $commentCount: Int!,
    $commentCursor: String,
  ) {
    repository:node(id: $repoId) {
      ...prDetailView_repository @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor
      )
    }

    pullRequest:node(id: $issueishId) {
      ...prDetailView_pullRequest @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor,
        commitCount: $commitCount,
        commitCursor: $commitCursor,
        reviewCount: $reviewCount,
        reviewCursor: $reviewCursor,
        commentCount: $commentCount,
        commentCursor: $commentCursor,
      )
    }
  }
`);
