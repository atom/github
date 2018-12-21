import React from 'react';
import PropTypes from 'prop-types';
import {Point, Range} from 'atom';

import Marker from '../atom/marker';
import MarkerLayer from '../atom/marker-layer';
import Decoration from '../atom/decoration';

import Timeago from './timeago';

export default class PullRequestCommentsView extends React.Component {

  render() {
    if (this.props.reviews) {
      return this.props.reviews.nodes.map(review => {
        return review.comments.nodes.map(comment => {
          if (comment.position !== null) {
            const filePatch = this.props.multiFilePatch.getFilePatchByPath(comment.path);
            const commentStartPoint = filePatch.getStartRange().start.translate(new Point(comment.position, 0));
            const range = new Range(commentStartPoint, commentStartPoint);
            const author = comment.author;
            return (
              <Marker key={`pr-comment-${comment.id}`} bufferRange={range} invalidate="never">
                <Decoration type="block" className="github-PrComment">
                  <div className="github-PrComment-wrapper">
                    <header className="github-PrComment-header">
                      <img className="github-PrComment-avatar" src={author.avatarUrl} />
                      {author ? author.login : 'someone'} commented{' '}
                      <a className="github-PrComment-timeAgo" href={comment.url}>
                        <Timeago time={comment.createdAt} />
                      </a>
                    </header>
                    <main className="github-PrComment-body">
                      {comment.body}
                    </main>
                  </div>
                </Decoration>
              </Marker>
            );
          }
          return null;
        });
      });
    }
  }
}
