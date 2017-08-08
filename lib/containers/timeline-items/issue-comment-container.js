import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import Octicon from '../../views/octicon';
import Timeago from '../../views/timeago';
import GithubDotcomMarkdown from '../../views/github-dotcom-markdown';

export class IssueComment extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    item: PropTypes.object.isRequired,
  }

  render() {
    const comment = this.props.item;
    return (
      <div className="issue timeline-item">
        <div className="info-row">
          <Octicon className="pre-timeline-item-icon" icon="comment" />
          <img className="author-avatar" src={comment.author.avatarUrl} title={comment.author.login} />
          <span className="comment-message-header">
            {comment.author.login} commented <Timeago time={comment.createdAt} />
          </span>
        </div>
        <GithubDotcomMarkdown html={comment.bodyHTML} switchToIssueish={this.props.switchToIssueish} />
      </div>
    );
  }
}

export default createFragmentContainer(IssueComment, {
  item: graphql`
    fragment IssueCommentContainer_item on IssueComment {
      author {
        avatarUrl login
      }
      bodyHTML createdAt
    }
  `,
});
