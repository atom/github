import {graphql, createPaginationContainer} from 'react-relay';

import PullRequestReviewsView from '../views/pr-comments-view';

export default createPaginationContainer(PullRequestReviewsView, {
  pullRequest: graphql`
    fragment prReviewsContainer_pullRequest on PullRequest
    @argumentDefinitions(
      reviewCount: {type: "Int"},
      reviewCursor: {type: "String"}
    ) {
      ... on PullRequest {
        url
        reviews(first: $reviewCount, after: $reviewCursor) @connection(key: "prReviewsContainer_reviews") {
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
    }
  `,
}, {
  direction: 'forward',
  getConnectionFromProps(props) {
    console.log(props.pullRequest);
    return props.pullRequest.reviews;
  },
  getFragmentVariables(prevVars, totalCount) {
    return {
      ...prevVars,
      reviewCount: totalCount,
    };
  },
  getVariables(props, {count, cursor}, fragmentVariables) {
    console.log(props.pullRequest);
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
