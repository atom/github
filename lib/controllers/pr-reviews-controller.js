import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {RelayConnectionPropType} from '../prop-types';

import PullRequestReviewCommentsContainer from '../containers/pr-review-comments-container';
import PullRequestReviewCommentsView from '../views/pr-review-comments-view';
import {PAGE_SIZE, PAGINATION_WAIT_TIME_MS} from '../helpers';

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
    getBufferRowForDiffPosition: PropTypes.func.isRequired,
    doesPatchExceedLargeDiffThreshold: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.reviewsById = new Map();
  }

  componentDidMount() {
    this._attemptToLoadMoreReviews();
  }

  _attemptToLoadMoreReviews = () => {
    if (!this.props.relay.hasMore()) {
      return;
    }

    if (this.props.relay.isLoading()) {
      setTimeout(this._loadMoreReviews, PAGINATION_WAIT_TIME_MS);
    } else {
      this._loadMoreReviews();
    }
  }

  accumulateReviews = error => {
    /* istanbul ignore if */
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } else {
      this._attemptToLoadMoreReviews();
    }
  }

  _loadMoreReviews = () => {
    this.props.relay.loadMore(PAGE_SIZE, this.accumulateReviews);
  }

  render() {
    if (!this.props.pullRequest || !this.props.pullRequest.reviews) {
      return null;
    }

    const commentThreads = Object.keys(this.state).reverse().map(rootCommentId => {
      return {
        rootCommentId,
        comments: this.state[rootCommentId],
      };
    });

    /** Dealing with comment threading...
      *
      * Threads can have comments belonging to multiple reviews.
      * We need a nested pagination container to fetch comment pages.
      * Upon fetching new comments, the `collectComments` method is called with all comments fetched for that review.
      * Ultimately we want to group comments based on the root comment they are replies to.
      * `renderCommentFetchingContainers` only fetches data and doesn't render any user visible DOM elements.
      * `PullRequestReviewCommentsView` renders the aggregated comment thread data.
    * */
    return (
      <Fragment>
        {this.renderCommentFetchingContainers()}
        <PullRequestReviewCommentsView commentThreads={commentThreads} {...this.props} />
      </Fragment>
    );
  }

  renderCommentFetchingContainers() {
    return this.props.pullRequest.reviews.edges.map(({node: review}) => {
      return (
        <PullRequestReviewCommentsContainer
          key={review.id}
          review={review}
          collectComments={this.collectComments}
        />
      );
    });
  }

  collectComments = ({reviewId, submittedAt, comments, fetchingMoreComments}) => {
    this.reviewsById.set(reviewId, {submittedAt, comments, fetchingMoreComments});
    const stillFetchingReviews = this.props.relay.hasMore();
    if (!stillFetchingReviews) {
      const stillFetchingComments = [...this.reviewsById.values()].some(review => review.fetchingMoreComments);
      if (!stillFetchingComments) {
        this.groupCommentsByThread();
      }
    }
  }

  groupCommentsByThread() {
    // we have no guarantees that reviews will return in order so sort them by date.
    const sortedReviews = [...this.reviewsById.values()].sort(this.compareReviewsByDate);

    // react batches calls to setState and does not update state synchronously
    // therefore we need an intermediate state so we can do checks against keys
    // we have just added.
    const state = {};
    sortedReviews.forEach(({comments}) => {
      comments.edges.forEach(({node: comment}) => {
        if (!comment.replyTo) {
          state[comment.id] = [comment];
        } else {
          // Ran into this error when viewing files for https://github.com/numpy/numpy/pull/9998
          // for comment MDI0OlB1bGxSZXF1ZXN0UmV2aWV3Q29tbWVudDE1MzA1NTUzMw,
          // who's replyTo comment does not exist.
          // Not sure how we'd get into this state -- tried replying to outdated,
          // hidden, deleted, and resolved comments but none of those conditions
          // got us here.
          // It may be that this only affects older pull requests, before something
          // changed with oudated comment behavior.
          // anyhow, do this check and move on with our lives.
          if (!state[comment.replyTo.id]) {
            state[comment.id] = [comment];
          } else {
            state[comment.replyTo.id].push(comment);
          }
        }
      });
    });

    this.setState(state);
  }

  // compare reviews by date ascending (in order to sort oldest to newest)
  compareReviewsByDate(reviewA, reviewB) {
    const dateA = new Date(reviewA.submittedAt);
    const dateB = new Date(reviewB.submittedAt);
    if (dateA > dateB) {
      return 1;
    } else if (dateB > dateA) {
      return -1;
    } else {
      return 0;
    }
  }
}
