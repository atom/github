import path from 'path';
import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {EnableableOperationPropType} from '../prop-types';
import Tooltip from '../atom/tooltip';
import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import {getDataFromGithubUrl} from './issueish-link';
import AggregatedReviewsContainer from '../containers/aggregated-reviews-container';
import EmojiReactionsController from '../controllers/emoji-reactions-controller';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import ErrorView from './error-view';
import PatchPreviewView from './patch-preview-view';
import CheckoutButton from './checkout-button';
import Timeago from './timeago';
import Octicon from '../atom/octicon';
import RefHolder from '../models/ref-holder';
import ResolveReviewThreadMutation from '../mutations/resolve-review-thread';
import UnresolveReviewThreadMutation from '../mutations/unresolve-review-thread';

export default class ReviewsView extends React.Component {
  static propTypes = {
    // GraphQL results
    repository: PropTypes.shape({
      pullRequest: PropTypes.object.isRequired,
    }).isRequired,

    // Package models
    multiFilePatch: PropTypes.object.isRequired,
    contextLines: PropTypes.number.isRequired,
    checkoutOp: EnableableOperationPropType.isRequired,

    // for the dotcom link in the empty state
    number: PropTypes.number.isRequired,
    repo: PropTypes.string.isRequired,
    owner: PropTypes.string.isRequired,
    workdir: PropTypes.string.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,

    // Action methods
    openFile: PropTypes.func.isRequired,
    openDiff: PropTypes.func.isRequired,
    openPR: PropTypes.func.isRequired,
    moreContext: PropTypes.func.isRequired,
    lessContext: PropTypes.func.isRequired,
    openIssueish: PropTypes.func.isRequired,
    addSingleComment: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.rootHolder = new RefHolder();
    this.replyHolders = new Map();
    this.state = {
      isRefreshing: false,
      resolvedThreadsMarkedVisible: new Set(),
    };
  }

  render() {
    return (
      <div className="github-Reviews" ref={this.rootHolder.setter}>
        {this.renderCommands()}

        <AggregatedReviewsContainer pullRequest={this.props.repository.pullRequest}>
          {({errors, summaries, commentThreads, refetch}) => {
            if (errors && errors.length > 0) {
              return this.renderErrors(errors);
            }

            return (
              <Fragment>
                {this.renderHeader(refetch)}
                <div className="github-Reviews-list">
                  {this.renderReviewSummaries(summaries)}
                  {this.renderReviewCommentThreads(commentThreads)}
                </div>
              </Fragment>
            );
          }}
        </AggregatedReviewsContainer>
      </div>
    );
  }

  renderErrors(errors) {
    return errors.map((error, i) => (
      <ErrorView
        key={`error-${i}`}
        title="Pagination error"
        descriptions={[error.stack || error.toString()]}
      />
    ));
  }

  renderCommands() {
    return (
      <Commands registry={this.props.commands} target={this.rootHolder}>
        <Command command="github:more-context" callback={this.props.moreContext} />
        <Command command="github:less-context" callback={this.props.lessContext} />
      </Commands>
    );
  }

  renderHeader(refetch) {
    const refresh = () => {
      if (this.state.isRefreshing) {
        return;
      }
      this.setState({isRefreshing: true});
      refetch(() => {
        this.setState({isRefreshing: false});
      });
    };
    return (
      <header className="github-Reviews-topHeader">
        <span className="icon icon-comment-discussion" />
        <span className="github-Reviews-headerTitle">
          Reviews for&nbsp;
          <span className="github-Reviews-clickable" onClick={this.props.openPR}>
            {this.props.owner}/{this.props.repo}#{this.props.number}
          </span>
        </span>
        <button
          className={cx(
            'github-Reviews-headerButton github-Reviews-clickable icon icon-repo-sync',
            {refreshing: this.state.isRefreshing},
          )}
          onClick={refresh}
        />
        <CheckoutButton
          checkoutOp={this.props.checkoutOp}
          classNamePrefix="github-Reviews-checkoutButton--"
          classNames={['github-Reviews-headerButton']}
        />
      </header>
    );
  }

  renderEmptyState() {
    const {number, repo, owner} = this.props;
    // todo: make this open the review flow in Atom instead of dotcom
    const pullRequestURL = `https://www.github.com/${owner}/${repo}/pull/${number}/`;
    return (
      <div className="github-Reviews-emptyState">
        <img src="atom://github/img/mona.svg" alt="Mona the octocat in spaaaccee" className="github-Reviews-emptyImg" />
        <div className="github-Reviews-emptyText">
          This pull request has no reviews
        </div>
        <div className="github-Reviews-emptyCallToActionText">
          <a href={pullRequestURL}>
            Start a review
          </a>
        </div>
      </div>
    );
  }

  renderReviewSummaries = summaries => {
    if (summaries.length === 0) {
      return this.renderEmptyState();
    }

    return (
      <details className="github-Reviews-section summaries" open>
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Summaries</span>
        </summary>
        <main className="github-Reviews-container">
          {summaries.map(this.renderReviewSummary)}
        </main>
      </details>
    );
  }

  renderReviewSummary = review => {
    const reviewTypes = type => {
      return {
        APPROVED: {icon: 'icon-check', copy: 'approved these changes'},
        COMMENTED: {icon: 'icon-comment', copy: 'commented'},
        CHANGES_REQUESTED: {icon: 'icon-alert', copy: 'requested changes'},
      }[type] || {icon: '', copy: ''};
    };

    const {icon, copy} = reviewTypes(review.state);

    // filter non actionable empty summary comments from this view
    if (copy === 'commented' && review.bodyHTML === '') {
      return null;
    }

    const reviewAuthor = review.author ? review.author.login : '';
    return (
      <div className="github-ReviewSummary" key={review.id}>
        <header className="github-ReviewSummary-header">
          <span className={`github-ReviewSummary-icon icon ${icon}`} />
          <img className="github-ReviewSummary-avatar"
            src={review.author ? review.author.avatarUrl : ''} alt={reviewAuthor}
          />
          <a className="github-ReviewSummary-username" href={`https://github.com/${reviewAuthor}`}>{reviewAuthor}</a>
          <span className="github-ReviewSummary-type">{copy}</span>
          <Timeago className="github-ReviewSummary-timeAgo" time={review.submittedAt} displayStyle="short" />
        </header>
        <main className="github-ReviewSummary-comment">
          <GithubDotcomMarkdown
            html={review.bodyHTML}
            switchToIssueish={this.props.openIssueish}
            openIssueishLinkInNewTab={this.openIssueishLinkInNewTab}
          />
          <EmojiReactionsController reactable={review} tooltips={this.props.tooltips} />
        </main>
      </div>
    );
  }

  renderReviewCommentThreads = commentThreads => {
    if (commentThreads.length === 0) {
      return null;
    }

    const resolvedThreads = commentThreads.filter(pair => pair.thread.isResolved).length;

    return (
      <details className="github-Reviews-section comments" open>
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Comments</span>
          <span className="github-Reviews-progress">
            <span className="github-Reviews-count">
              Resolved
              {' '}<span className="github-Reviews-countNr">{resolvedThreads}</span>{' '}
              of
              {' '}<span className="github-Reviews-countNr">{commentThreads.length}</span>
            </span>
            <progress className="github-Reviews-progessBar" value={resolvedThreads} max={commentThreads.length} />
          </span>
        </summary>
        <main className="github-Reviews-container">
          {commentThreads.map(this.renderReviewCommentThread)}
        </main>
      </details>
    );
  }

  renderReviewCommentThread = commentThread => {
    const {comments, thread} = commentThread;
    const rootComment = comments[0];
    if (!rootComment) {
      return null;
    }
    const {dir, base} = path.parse(rootComment.path);
    // TODO: fixme
    const lineNumber = rootComment.position;

    const refJumpToFileButton = new RefHolder();
    const jumpToFileDisabledLabel = 'Checkout this pull request to enable Jump To File.';

    const threadVisible = !thread.isResolved || this.state.resolvedThreadsMarkedVisible.has(thread.id);
    const positionText = lineNumber ? lineNumber : 'outdated';
    const navButtonClasses = cx('github-Review-navButton icon icon-code', {outdated: !lineNumber});

    return (
      <details className="github-Review" key={`review-comment-${rootComment.id}`}>
        <summary className="github-Review-reference">
          <span className="github-Review-resolvedIcon icon icon-check" />
          {dir && <span className="github-Review-path">{dir}</span>}
          <span className="github-Review-file">{dir ? '/' : ''}{base}</span>
          <span className="github-Review-lineNr">{positionText}</span>
          <img className="github-Review-referenceAvatar"
            src={rootComment.author ? rootComment.author.avatarUrl : ''} alt={rootComment.author.login}
          />
          <Timeago className="github-Review-referenceTimeAgo" time={rootComment.createdAt} displayStyle="short" />
        </summary>
        <nav className="github-Review-nav">
          <button className={navButtonClasses}
            data-path={rootComment.path} data-line={lineNumber} data-diff={rootComment.diffHunk}
            onClick={this.openFile} disabled={this.props.checkoutOp.isEnabled()}
            ref={refJumpToFileButton.setter}>
            Jump To File
          </button>
          <button className={navButtonClasses}
            data-path={rootComment.path} data-line={lineNumber}
            onClick={this.openDiff}>
            Open Diff
          </button>
          {this.props.checkoutOp.isEnabled() &&
            <Tooltip
              manager={this.props.tooltips}
              target={refJumpToFileButton}
              title={jumpToFileDisabledLabel}
              showDelay={200}
            />
          }
        </nav>

        {rootComment.position !== null && (
          <PatchPreviewView
            multiFilePatch={this.props.multiFilePatch}
            fileName={rootComment.path}
            diffRow={rootComment.position}
            maxRowCount={this.props.contextLines}
            config={this.props.config}
          />
        )}

        {thread.isResolved && this.renderResolvedHeader(thread, threadVisible)}
        {threadVisible && this.renderThread({thread, comments})}
      </details>
    );
  }

  renderResolvedHeader = (thread, visible) => {
    return (
      <Fragment>
        <div> Marked as resolved by @{thread.resolvedBy.login} </div>
        {
          visible ?
            <button onClick={() => this.collapseThread(thread.id)}> Hide conversation </button> :
            <button onClick={() => this.uncollapseThread(thread.id)}> Show conversation </button>
        }
      </Fragment>
    );
  }

  renderThread = ({thread, comments}) => {
    let replyHolder = this.replyHolders.get(thread.id);
    if (!replyHolder) {
      replyHolder = new RefHolder();
      this.replyHolders.set(thread.id, replyHolder);
    }
    const lastComment = comments[comments.length - 1];

    return (
      <Fragment>
        <main className="github-Review-comments">

          {comments.map(this.renderComment)}

          <div className="github-Review-reply">
            <AtomTextEditor
              placeholderText="Reply..."
              lineNumberGutterVisible={false}
              softWrapped={true}
              autoHeight={true}
              refModel={replyHolder}
            />
          </div>
        </main>
        <footer className="github-Review-footer">
          <button
            className="github-Review-replyButton btn"
            title="Add your comment"
            onClick={() => this.submitReply(replyHolder, thread, lastComment)}>
            Comment
          </button>
          {this.renderResolveButton(thread)}
        </footer>
      </Fragment>
    );
  }

  renderResolveButton = thread => {
    if (thread.isResolved) {
      return (
        <button
          className="github-Review-resolveButton btn btn-primary icon icon-check"
          title="Unresolve conversation"
          onClick={() => this.unresolveReviewThread(thread)}>
          Unresolve conversation
        </button>
      );
    } else {
      return (
        <button
          className="github-Review-resolveButton btn btn-primary icon icon-check"
          title="Resolve conversation"
          onClick={() => this.resolveReviewThread(thread)}>
          Resolve conversation
        </button>
      );
    }
  }

  renderComment = comment => {
    if (comment.isMinimized) {
      return (
        <div className="github-Review-comment github-Review-comment--hidden" key={comment.id}>
          <Octicon icon={'fold'} className="github-Review-icon" />
          <em>This comment was hidden</em>
        </div>
      );
    }

    return (
      <div className="github-Review-comment" key={comment.id}>
        <header className="github-Review-header">
          <img className="github-Review-avatar"
            src={comment.author ? comment.author.avatarUrl : ''} alt={comment.author.login}
          />
          <a className="github-Review-username" href={`https://github.com/${comment.author.login}`}>{comment.author.login}</a>
          <a className="github-Review-timeAgo" href={comment.url}>
            <Timeago displayStyle="long" time={comment.createdAt} />
          </a>
        </header>
        <div className="github-Review-text">
          <GithubDotcomMarkdown
            html={comment.bodyHTML}
            switchToIssueish={this.props.openIssueish}
            openIssueishLinkInNewTab={this.openIssueishLinkInNewTab}
          />
          <EmojiReactionsController reactable={comment} tooltips={this.props.tooltips} />
        </div>
      </div>
    );
  }

  collapseThread = threadId => {
    const resolvedThreadsMarkedVisible = this.state.resolvedThreadsMarkedVisible;
    resolvedThreadsMarkedVisible.delete(threadId);
    this.setState({resolvedThreadsMarkedVisible});
  }

  uncollapseThread = threadId => {
    const resolvedThreadsMarkedVisible = this.state.resolvedThreadsMarkedVisible;
    resolvedThreadsMarkedVisible.add(threadId);
    this.setState({resolvedThreadsMarkedVisible});
  }

  openFile = evt => {
    if (!this.props.checkoutOp.isEnabled()) {
      const target = evt.currentTarget;
      this.props.openFile(target.dataset.path, target.dataset.diff);
    }
  }

  openDiff = evt => {
    const target = evt.currentTarget;
    this.props.openDiff(target.dataset.path, parseInt(target.dataset.line, 10));
  }

  openIssueishLinkInNewTab = evt => {
    const {repoOwner, repoName, issueishNumber} = getDataFromGithubUrl(evt.target.dataset.url);
    return this.props.openIssueish(repoOwner, repoName, issueishNumber);
  }

  resolveReviewThread = thread => {
    if (thread.viewerCanResolve) {
      this.collapseThread(thread.id);
      const onCompleted = () => this.collapseThread(thread.id);
      const onError = () => this.uncollapseThread(thread.id);
      ResolveReviewThreadMutation(thread.id, this.props.relay.environment, onCompleted, onError);
    }
  }

  unresolveReviewThread = thread => {
    if (thread.viewerCanUnresolve) {
      UnresolveReviewThreadMutation(thread.id, this.props.relay.environment);
    }
  }

  submitReply(replyHolder, thread, lastComment) {
    const body = replyHolder.map(editor => editor.getText()).getOr('');
    return this.props.addSingleComment(body, thread.id, lastComment.id);
  }
}
