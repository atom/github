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
    multiFilePatch: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this._attemptToLoadMoreReviews();
  }

  _loadMoreReviews = () => {
    this.props.relay.loadMore(
      PAGE_SIZE,
      error => {
        this._attemptToLoadMoreReviews();
        if (error) {
          // eslint-disable-next-line no-console
          console.error(error);
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
      }, PAGINATION_WAIT_TIME_MS);
    } else {
      this._loadMoreReviews();
    }
  }

  aggregateComments = (reviewId, comments) => {
    // react batches calls to setState and does not update state synchronously
    // therefore we need an intermediate state so we can do checks against keys
    // we have just added.
    const state = this.state;
    comments.edges.forEach(({node}) => {
      const comment = node;
      if (!comment.replyTo) {
        state[comment.id] = [comment];
      } else {
        // When comment being replied to is outdated...?? Not 100% sure...
        // Why would we even get an outdated comment or a response to one here?
        // Ran into this error when viewing files for https://github.com/numpy/numpy/pull/9998
        // for comment MDI0OlB1bGxSZXF1ZXN0UmV2aWV3Q29tbWVudDE1MzA1NTUzMw,
        // who's replyTo comment is an outdated comment
        if (!state[comment.replyTo.id]) {
          state[comment.id] = [comment];
        } else {
          state[comment.replyTo.id].push(comment);
        }
      }
    });
    this.setState(state);
  }

  renderCommentFetchingContainers() {
    // Aggregate comments from all reviews
    return this.props.pullRequest.reviews.edges.map(({node}) => {
      const review = node;
      return (
        <PullRequestReviewCommentsContainer
          key={review.id}
          review={review}
          aggregateComments={this.aggregateComments}
        />
      );
    });
  }

  render() {
    if (!this.props.pullRequest || !this.props.pullRequest.reviews) {
      return null;
    }

    const commentThreads = Object.keys(this.state).map(rootCommentId => {
      return {
        rootCommentId,
        comments: this.state[rootCommentId],
      };
    });

    /** Slightly hacky thing to deal with comment threading...
      *
      * Threads can have comments belonging to multiple reviews.
      * We need a nested pagination container to fetch comment pages.
      * Upon fetching new comments, the `aggregateComments` method is called with the comments to add.
      * Ultimately we want to organize comments based on the root comment they are replies to.
      * So `renderCommentFetchingContainers` simply fetches data and doesn't render any DOM elements.
      * `PullRequestReviewCommentsView` renders the comment thread data aggregated.
    * */
    return (
      <Fragment>
        {this.renderCommentFetchingContainers()}
        <PullRequestReviewCommentsView commentThreads={commentThreads} {...this.props} />
      </Fragment>
    );
  }
}
