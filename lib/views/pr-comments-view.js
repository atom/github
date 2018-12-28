import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';
import {RelayConnectionPropType} from '../prop-types';

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
    pullRequest: PropTypes.shape({
      reviews: RelayConnectionPropType(
        PropTypes.object,
      ),
    }),
    multiFilePatch: PropTypes.object.isRequired,
  }

  componentDidMount() {
    console.log('DID MOUNT');
    this._attemptToLoadMoreReviews();
  }

  _loadMoreReviews = () => {
    this.props.relay.loadMore(
      1, // Fetch the next 10 feed items
      error => {
        this._attemptToLoadMoreReviews();
        if (error) {
          console.log(error);
        }
      },
    );
  }

  _attemptToLoadMoreReviews = () => {
    if (!this.props.relay.hasMore()) {
      return;
    }

    if (this.props.relay.isLoading()) {
      setTimeout(() => {
        this._loadMoreReviews();
      }, 300);
    } else {
      this._loadMoreReviews();
    }
  }

  render() {
    if (!this.props.pullRequest || !this.props.pullRequest.reviews) {
      return null;
    }

    const commentsByRootCommentId = new Map();

    this.props.pullRequest.reviews.edges.forEach(({node}) => {
      const review = node;
      review.comments.nodes.forEach(comment => {
        if (!comment.replyTo) {
          commentsByRootCommentId.set(comment.id, [comment]);
        } else {
          commentsByRootCommentId.get(comment.replyTo.id).push(comment);
        }
      });
    });

    console.log('SIZE', commentsByRootCommentId.size, [...commentsByRootCommentId]);

    return [...commentsByRootCommentId].reverse().map(([rootCommentId, comments]) => {
      const rootComment = comments[0];
      if (!rootComment.position) {
        return null;
      }

      const nativePath = toNativePathSep(rootComment.path);
      const row = this.props.multiFilePatch.getBufferRowForDiffPosition(nativePath, rootComment.position);
      const point = new Point(row, 0);
      const range = new Range(point, point);
      return (
        <Marker key={`pr-comment-${rootCommentId}`} bufferRange={range} invalidate="never">
          <Decoration type="block" position="after" className="github-PrCommentThread">
            {comments.map(comment => {
              console.log(comment.body);
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
  render() {
    const author = this.props.comment.author;
    const login = author ? author.login : 'someone';
    return (
      <div className="github-PrComment-wrapper">
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
