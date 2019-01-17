import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';

import {toNativePathSep} from '../helpers';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import Octicon from '../atom/octicon';

import GithubDotcomMarkdown from './github-dotcom-markdown';
import Timeago from './timeago';

export default class PullRequestCommentsView extends React.Component {
  // do we even need the relay props here? does not look like they are used
  static propTypes = {
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
    commentThreads: PropTypes.arrayOf(PropTypes.shape({
      rootCommentId: PropTypes.string.isRequired,
      comments: PropTypes.arrayOf(PropTypes.object).isRequired,
    })),
    getBufferRowForDiffPosition: PropTypes.func.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    isPatchTooLargeOrCollapsed: PropTypes.func.isRequired,
  }

  render() {
    return [...this.props.commentThreads].map(({rootCommentId, comments}) => {
      const rootComment = comments[0];
      if (!rootComment.position) {
        return null;
      }

      // if file patch is collapsed or too large, do not render the comments
      if (this.props.isPatchTooLargeOrCollapsed(rootComment.path)) {
        return null;
      }
      const nativePath = toNativePathSep(rootComment.path);
      const row = this.props.getBufferRowForDiffPosition(nativePath, rootComment.position);
      const point = new Point(row, 0);
      const range = new Range(point, point);
      return (
        <Marker key={`pr-comment-${rootCommentId}`} bufferRange={range} invalidate="never">
          <Decoration type="block" position="after" className="github-PrCommentThread">
            {comments.map(comment => {
              return (
                <PullRequestCommentView
                  key={comment.id}
                  comment={comment}
                  switchToIssueish={this.props.switchToIssueish}
                />
              );
            })}
          </Decoration>
        </Marker>
      );
    });
  }
}

export class PullRequestCommentView extends React.Component {

  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    comment: PropTypes.shape({
      author: PropTypes.shape({
        avatarUrl: PropTypes.string,
        login: PropTypes.string,
      }),
      bodyHTML: PropTypes.string,
      url: PropTypes.string,
      createdAt: PropTypes.string.isRequired,
      isMinimized: PropTypes.bool.isRequired,
    }).isRequired,
  }

  render() {
    if (this.props.comment.isMinimized) {
      return (
        <div className="github-PrComment">
          <span className="github-PrComment-hidden">
            <Octicon icon={'fold'} className="github-PrComment-icon" />
            <em>This comment was hidden</em>
          </span>
        </div>
      );
    } else {
      const author = this.props.comment.author;
      const login = author ? author.login : 'someone';
      return (
        <div className="github-PrComment">
          <header className="github-PrComment-header">
            <img className="github-PrComment-avatar" src={author ? author.avatarUrl : ''} alt={login} />
            {login} commented{' '}
            <a className="github-PrComment-timeAgo" href={this.props.comment.url}>
              <Timeago time={this.props.comment.createdAt} />
            </a>
          </header>
          <main className="github-PrComment-body">
            <GithubDotcomMarkdown html={this.props.comment.bodyHTML} switchToIssueish={this.props.switchToIssueish} />
          </main>
        </div>
      );
    }
  }
}
