import {graphql, createPaginationContainer} from 'react-relay';

import PullRequestReviewsController from '../controllers/pr-reviews-controller';

export default createPaginationContainer(PullRequestReviewsController, {
  pullRequest: graphql`
    fragment prReviewsContainer_pullRequest on PullRequest
    @argumentDefinitions(
      reviewCount: {type: "Int"},
      reviewCursor: {type: "String"}
    ) {
      url
      reviews(
        first: $reviewCount,
        after: $reviewCursor
      ) @connection(key: "PrReviewsContainer_reviews") {
        pageInfo {
          hasNextPage
          endCursor
        }

        edges {
          cursor
          node {
            id
            body
            commitId: commit {
              oid
            }
            state
            submittedAt
            login: author {
              login
            }
            author {
              avatarUrl
            }
            ...prReviewCommentsContainer_review @arguments(
              commentCount: $commentCount,
              commentCursor: $commentCursor
            )
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  getConnectionFromProps(props) {
    return props.pullRequest.reviews;
  },
  getFragmentVariables(prevVars, totalCount) {
    return {
      ...prevVars,
      reviewCount: totalCount,
    };
  },
  getVariables(props, {count, cursor}, fragmentVariables) {
    return {
      url: props.pullRequest.url,
      reviewCount: count,
      reviewCursor: cursor,
    };
  },
  query: graphql`
    query prReviewsContainerQuery($reviewCount: Int, $reviewCursor: String, $url: URI!) {
      resource(url: $url) {
        ... on PullRequest {
          ...prReviewsContainer_pullRequest @arguments(reviewCount: $reviewCount, reviewCursor: $reviewCursor)
        }
      }
    }
  `,
});
