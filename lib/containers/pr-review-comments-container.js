import {graphql, createPaginationContainer} from 'react-relay';
import React from 'react';

export class ReviewCommentsController extends React.Component {

  componentDidMount() {
    this.props.aggregateComments(this.props.review.id, this.props.review.comments);
    this._attemptToLoadMoreComments();
  }

  _loadMoreComments = () => {
    this.props.relay.loadMore(
      100,
      error => {
        console.log('loaded more comments!', this.props.review.comments.edges);
        this._attemptToLoadMoreComments();
        if (error) {
          console.log(error);
        }
      },
    );
  }

  _attemptToLoadMoreComments = () => {
    if (!this.props.relay.hasMore()) {
      return;
    }

    if (this.props.relay.isLoading()) {
      setTimeout(() => {
        this._loadMoreComments();
      }, 300);
    } else {
      this._loadMoreComments();
    }
  }

  render() {
    return null;
  }
}

export default createPaginationContainer(ReviewCommentsController, {
  review: graphql`
    fragment prReviewCommentsContainer_review on PullRequestReview
    @argumentDefinitions(
      commentCount: {type: "Int!"},
      commentCursor: {type: "String"}
    ) {
      id
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
            body
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
