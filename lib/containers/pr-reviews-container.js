import {graphql, createPaginationContainer} from 'react-relay';

import PullRequestReviewsView from '../views/pr-comments-view';

export default createPaginationContainer(PullRequestReviewsView, {
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
            comments(first: 100) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
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
