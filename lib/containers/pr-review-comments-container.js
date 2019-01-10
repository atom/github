import {graphql, createPaginationContainer} from 'react-relay';
import PropTypes from 'prop-types';
import React from 'react';

import {PAGE_SIZE, PAGINATION_WAIT_TIME_MS} from '../helpers';

export class BarePullRequestReviewCommentsContainer extends React.Component {

  static propTypes = {
    collectComments: PropTypes.func.isRequired,
    review: PropTypes.shape({
      id: PropTypes.string.isRequired,
      submittedAt: PropTypes.string.isRequired,
      comments: PropTypes.object.isRequired,
    }),
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.accumulateComments();
  }

  accumulateComments = error => {
    /* istanbul ignore if */
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }

    const {submittedAt, comments, id} = this.props.review;
    this.props.collectComments({
      reviewId: id,
      submittedAt,
      comments,
      fetchingMoreComments: this.props.relay.hasMore(),
    });

    this._attemptToLoadMoreComments();
  }

  _attemptToLoadMoreComments = () => {
    if (!this.props.relay.hasMore()) {
      return;
    }

    if (this.props.relay.isLoading()) {
      setTimeout(this._loadMoreComments, PAGINATION_WAIT_TIME_MS);
    } else {
      this._loadMoreComments();
    }
  }

  _loadMoreComments = () => {
    this.props.relay.loadMore(
      PAGE_SIZE,
      this.accumulateComments,
    );
  }

  render() {
    return null;
  }
}

export default createPaginationContainer(BarePullRequestReviewCommentsContainer, {
  review: graphql`
    fragment prReviewCommentsContainer_review on PullRequestReview
    @argumentDefinitions(
      commentCount: {type: "Int!"},
      commentCursor: {type: "String"}
    ) {
      id
      submittedAt
      comments(
        first: $commentCount,
        after: $commentCursor
      ) @connection(key: "PrReviewCommentsContainer_comments") {
        pageInfo {
          hasNextPage
          endCursor
        }

        edges {
          cursor
          node {
            id
            author {
              avatarUrl
              login
            }
            bodyHTML
            path
            position
            replyTo {
              id
            }
            createdAt
            url
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  getConnectionFromProps(props) {
    return props.review.comments;
  },
  getFragmentVariables(prevVars, totalCount) {
    return {
      ...prevVars,
      commentCount: totalCount,
    };
  },
  getVariables(props, {count, cursor}, fragmentVariables) {
    return {
      id: props.review.id,
      commentCount: count,
      commentCursor: cursor,
    };
  },
  query: graphql`
    query prReviewCommentsContainerQuery($commentCount: Int!, $commentCursor: String, $id: ID!) {
      node(id: $id) {
        ... on PullRequestReview {
          ...prReviewCommentsContainer_review @arguments(
            commentCount: $commentCount,
            commentCursor: $commentCursor
          )
        }
      }
    }
  `,
});
