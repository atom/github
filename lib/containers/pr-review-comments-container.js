import {graphql, createPaginationContainer} from 'react-relay';

import PullRequestReviewCommentsView from '../views/pr-comments-view';

export default createPaginationContainer(PullRequestReviewCommentsView, {
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
