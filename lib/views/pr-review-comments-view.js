import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';

import {toNativePathSep} from '../helpers';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import Timeago from './timeago';

export default class PullRequestCommentsView extends React.Component {
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
    multiFilePatch: PropTypes.object.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
  }

  render() {
    return [...this.props.commentThreads].reverse().map(({rootCommentId, comments}) => {
      const rootComment = comments[0];
      if (!rootComment.position) {
        return null;
      }

      const nativePath = toNativePathSep(rootComment.path);
      const row = this.props.multiFilePatch.getBufferRowForDiffPosition(nativePath, rootComment.position);
      const point = new Point(row, 0);
      const range = new Range(point, point);
      // TODO: find way to re-use nodes by using same key. this count++ hack is in place to get the comments to show up
      // in the correct order after new pages of data are fetched. Test it by reducing the reviewCount to a small number
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
    }).isRequired,
  }

  render() {
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
