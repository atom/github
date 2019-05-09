import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import RefHolder from '../models/ref-holder';
import Timeago from './timeago';
import Octicon from '../atom/octicon';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import EmojiReactionsController from '../controllers/emoji-reactions-controller';
import {GHOST_USER} from '../helpers';
import ActionableReviewView from './actionable-review-view';

export default class ReviewCommentView extends React.Component {
  static propTypes = {
    comment: PropTypes.object.isRequired,
    isPosting: PropTypes.bool.isRequired,
    confirm: PropTypes.func.isRequired,
    tooltips: PropTypes.object.isRequired,
    renderEditedLink: PropTypes.func.isRequired,
    renderAuthorAssociation: PropTypes.func.isRequired,
    reportMutationErrors: PropTypes.func.isRequired,
    openIssueish: PropTypes.func.isRequired,
    openIssueishLinkInNewTab: PropTypes.func.isRequired,
    updateComment: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.refEditor = new RefHolder();
  }

  render() {
    return (
      <ActionableReviewView
        originalContent={this.props.comment}
        isPosting={this.props.isPosting}
        confirm={this.props.confirm}
        contentUpdater={this.props.updateComment}
        render={this.renderComment}
      />);
  }

  renderComment = showActionsMenu => {
    const comment = this.props.comment;

    if (comment.isMinimized) {
      return (
        <div className="github-Review-comment github-Review-comment--hidden" key={comment.id}>
          <Octicon icon={'fold'} className="github-Review-icon" />
          <em>This comment was hidden</em>
        </div>
      );
    }

    const commentClass = cx('github-Review-comment', {'github-Review-comment--pending': comment.state === 'PENDING'});
    const author = comment.author || GHOST_USER;

    return (
      <div className={commentClass} key={comment.id}>
        <header className="github-Review-header">
          <div className="github-Review-header-authorData">
            <img className="github-Review-avatar"
              src={author.avatarUrl} alt={author.login}
            />
            <a className="github-Review-username" href={author.url}>
              {author.login}
            </a>
            <a className="github-Review-timeAgo" href={comment.url}>
              <Timeago displayStyle="long" time={comment.createdAt} />
            </a>
            {this.props.renderEditedLink(comment)}
            {this.props.renderAuthorAssociation(comment)}
            {comment.state === 'PENDING' && (
              <span className="github-Review-pendingBadge badge badge-warning">pending</span>
            )}
          </div>
          <Octicon
            icon="ellipses"
            className="github-Review-actionsMenu"
            onClick={event => showActionsMenu(event, comment, author)}
          />
        </header>
        <div className="github-Review-text">
          <GithubDotcomMarkdown
            html={comment.bodyHTML}
            switchToIssueish={this.props.openIssueish}
            openIssueishLinkInNewTab={this.props.openIssueishLinkInNewTab}
          />
          <EmojiReactionsController
            reactable={comment}
            tooltips={this.props.tooltips}
            reportMutationErrors={this.props.reportMutationErrors}
          />
        </div>
      </div>
    );
  }

}
