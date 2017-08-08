import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import Octicon from '../../views/octicon';
import Timeago from '../../views/timeago';
import GithubDotcomMarkdown from '../../views/github-dotcom-markdown';

export class CommitComment extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
    isReply: PropTypes.bool.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
  }

  render() {
    const comment = this.props.item;
    return (
      <div className="issue">
        <div className="info-row">
          {this.props.isReply ? null : <Octicon className="pre-timeline-item-icon" icon="comment" />}
          <img className="author-avatar" src={comment.author.avatarUrl} title={comment.author.login} />
          {this.renderHeader(comment)}
        </div>
        <GithubDotcomMarkdown html={comment.bodyHTML} switchToIssueish={this.props.switchToIssueish} />
      </div>
    );
  }

  renderHeader(comment) {
    if (this.props.isReply) {
      return (
        <span className="comment-message-header">
          {comment.author.login} replied <Timeago time={comment.createdAt} />
        </span>
      );
    } else {
      return (
        <span className="comment-message-header">
          {comment.author.login} commented {this.renderPath()} in
          {' '}{comment.commit.oid.substr(0, 7)} <Timeago time={comment.createdAt} />
        </span>
      );
    }
  }

  renderPath() {
    if (this.props.item.path) {
      return <span>on <code>{this.props.item.path}</code></span>;
    } else {
      return null;
    }
  }
}

export default createFragmentContainer(CommitComment, {
  item: graphql`
    fragment CommitCommentContainer_item on CommitComment {
      author {
        login avatarUrl
      }
      commit { oid }
      bodyHTML createdAt path position
    }
  `,
});
