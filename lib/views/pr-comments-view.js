import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';

import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import Timeago from './timeago';


export default class PullRequestCommentsView extends React.Component {
  render() {
    if (!this.props.reviews) {
      return null;
    }

    return this.props.reviews.nodes.map(review => {
      return review.comments.nodes.map(comment => {
        if (comment.position !== null) {
          const filePatch = this.props.multiFilePatch.getFilePatchByPath(comment.path);
          const commentStartPoint = filePatch.getStartRange().start.translate(new Point(comment.position, 0));
          const range = new Range(commentStartPoint, commentStartPoint);
          return (
            <Marker key={`pr-comment-${comment.id}`} bufferRange={range} invalidate="never">
              <Decoration type="block" className="github-PrComment">
                <PullRequestCommentView comment={comment} switchToIssueish={this.props.switchToIssueish}/>
              </Decoration>
            </Marker>
          );
        }
        return null;
      });
    });
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
