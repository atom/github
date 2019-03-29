import React from 'react';
import {Range} from 'atom';
import PropTypes from 'prop-types';
import {EndpointPropType} from '../prop-types';
import Decoration from '../atom/decoration';
import Marker from '../atom/marker';
import ReviewsItem from '../items/reviews-item';
import {addEvent} from '../reporter-proxy';

export default class CommentGutterDecorationController extends React.Component {

  static propTypes = {
    commentRow: PropTypes.number.isRequired,
    threadId: PropTypes.string.isRequired,
    workspace: PropTypes.object.isRequired,

    endpoint: EndpointPropType.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    number: PropTypes.number.isRequired,
    workdir: PropTypes.string.isRequired,

    editor: PropTypes.object,
  };

  render() {
    const range = Range.fromObject([[this.props.commentRow, 0], [this.props.commentRow, 0]]);
    return (
      <Marker
        key={`github-comment-gutter-decoration-${this.props.threadId}`}
        editor={this.props.editor}
        bufferRange={range}>
        <Decoration
          editor={this.props.editor}
          type="gutter"
          gutterName="github-comment-icon"
          className="github-editorCommentGutterIcon"
          omitEmptyLastRow={false}>
          <button className="icon icon-comment" onClick={() => this.openReviewThread(this.props.threadId)} />
        </Decoration>
      </Marker>
    );
  }

  async openReviewThread(threadId) {
    const uri = ReviewsItem.buildURI(
      this.props.endpoint.getHost(),
      this.props.owner,
      this.props.repo,
      this.props.number,
      this.props.workdir,
    );
    const reviewsItem = await this.props.workspace.open(uri, {searchAllPanes: true});
    reviewsItem.jumpToThread(threadId);
    addEvent('open-review-thread', {package: 'github'});
  }

}
