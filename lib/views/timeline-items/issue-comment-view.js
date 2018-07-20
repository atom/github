import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import Octicon from '../../atom/octicon';
import Timeago from '../timeago';
import GithubDotcomMarkdown from '../github-dotcom-markdown';

export class BareIssueCommentView extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    item: PropTypes.shape({
      author: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        login: PropTypes.string.isRequired,
      }),
      bodyHTML: PropTypes.string.isRequired,
      createdAt: PropTypes.string.isRequired,
    }).isRequired,
  }

  render() {
    const comment = this.props.item;
    const author = comment.author;

    return (
      <div className="issue timeline-item">
        <div className="info-row">
          <Octicon className="pre-timeline-item-icon" icon="comment" />
          {author &&
            <img className="author-avatar" src={author.avatarUrl}
              alt={comment.author.login} title={comment.author.login}
            />
          }
          <span className="comment-message-header">
            {author ? author.login : 'someone'} commented
            {' '}<a href={comment.url}><Timeago time={comment.createdAt} /></a>
          </span>
        </div>
        <GithubDotcomMarkdown html={comment.bodyHTML} switchToIssueish={this.props.switchToIssueish} />
      </div>
    );
  }
}

export default createFragmentContainer(BareIssueCommentView, {
  item: graphql`
    fragment issueCommentView_item on IssueComment {
      author {
        avatarUrl login
      }
      bodyHTML createdAt url
    }
  `,
});
