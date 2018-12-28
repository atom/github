import React from 'react';
import PropTypes from 'prop-types';
import {RelayConnectionPropType} from '../prop-types';

import PullRequestReviewCommentsContainer from '../containers/pr-review-comments-container';


export default class PullRequestReviewsController extends React.Component {
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
    this._attemptToLoadMoreReviews();
  }

  _loadMoreReviews = () => {
    this.props.relay.loadMore(
      100,
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

    return this.props.pullRequest.reviews.forEach.map(({node}) => {
      const review = node;
      const reviewProp = this.props.reviews.find(r => r.id === review.id)
      reviewProp.comments = review.comments;
      return (
        <PullRequestReviewCommentsContainer reviewProp={reviewProp} key={review.id} review={review} {...this.props} />
      );
    });
  }
}
