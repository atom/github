import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';

import {toNativePathSep} from '../helpers';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import Timeago from './timeago';

export default class PullRequestCommentsView extends React.Component {
  render() {
    if (!this.props.reviews) {
      return null;
    }

    const commentsByPosition = new Map();
    this.props.reviews.nodes.forEach(review => {
      review.comments.nodes.forEach(comment => {
        const nativePath = toNativePathSep(comment.path);
        const row = this.props.multiFilePatch.getBufferRowForDiffPosition(nativePath, comment.position);
        const commentsAtRow = commentsByPosition.get(row);
        if (commentsAtRow) {
          commentsAtRow.add(comment);
        } else {
          commentsByPosition.set(row, new Set([comment]));
        }
      });
    });

    return [...commentsByPosition].map(([row, comments]) => {
      const getUnixTime = epoch => new Date(epoch).getTime() / 1000;
      console.log([...comments]);
      const sortedComments = [...comments].sort((a, b) => getUnixTime(a.createdAt) - getUnixTime(b.createdAt));

      console.log(sortedComments);
      return sortedComments.map(comment => {
        if (!comment.position) {
          return null;
        }

        const point = new Point(row, 0);
        const range = new Range(point, point);

        return (
          <Marker key={`pr-comment-${comment.id}`} bufferRange={range} invalidate="never">
            <Decoration type="block" position="after" className="github-PrComment">
              <PullRequestCommentView comment={comment} switchToIssueish={this.props.switchToIssueish} />
            </Decoration>
          </Marker>
        );
      });
    });

    // debugger;
    //
    // return this.props.reviews.nodes.map(review => {
    //   return review.comments.nodes.map(comment => {
    //     if (!comment.position) {
    //       return null;
    //     }
    //
    //     const nativePath = toNativePathSep(comment.path);
    //     const row = this.props.multiFilePatch.getBufferRowForDiffPosition(nativePath, comment.position);
    //     const point = new Point(row, 0);
    //     const range = new Range(point, point);
    //
    //     return (
    //       <Marker key={`pr-comment-${comment.id}`} bufferRange={range} invalidate="never">
    //         <Decoration type="block" position="after" className="github-PrComment">
    //           <PullRequestCommentView comment={comment} switchToIssueish={this.props.switchToIssueish} />
    //         </Decoration>
    //       </Marker>
    //     );
    //   });
    // });
  }
}

class PullRequestCommentView extends React.Component {
  render() {
    const author = this.props.comment.author;
    return (
      <div className="github-PrComment-wrapper">
        <header className="github-PrComment-header">
          <img className="github-PrComment-avatar" src={author.avatarUrl} alt="{author.login}" />
          {author ? author.login : 'someone'} commented{' '}
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
