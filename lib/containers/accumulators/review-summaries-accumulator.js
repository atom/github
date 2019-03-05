import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createPaginationContainer} from 'react-relay';

import {PAGE_SIZE, PAGINATION_WAIT_TIME_MS} from '../../helpers';
import {RelayConnectionPropType} from '../prop-types';
import Accumulator from './accumulator';

class ReviewSummariesAccumulator extends React.Component {
  static propTypes = {
    // Relay props
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

    // Render prop. Called with (error or null, array of all reviews, loading)
    children: PropTypes.func,

    // Non-render callback prop. Called with (error or null, array of all reviews, loading)
    handleResults: PropTypes.func,
  }

  render() {
    return (
      <Accumulator
        relay={this.props.relay}
        resultsBatch={this.props.pullRequest.reviews}
        handleResults={this.props.handleResults}
        pageSize={PAGE_SIZE}
        waitTimeMs={PAGINATION_WAIT_TIME_MS}>
        {this.props.children}
      </Accumulator>
    );
  }
}

export default createPaginationContainer(ReviewSummariesAccumulator, {
  pullRequest: graphql`
    fragment reviewSummariesAccumulator_pullRequest on PullRequest
    @argumentDefinitions(
      reviewCount: {type: "Int!"}
      reviewCursor: {type: "String"},
    ) {
      url
      reviews(
        first: $reviewCount
        after: $reviewCursor
      ) @connection(key: "ReviewSummariesAccumulator_reviews") {
        pageInfo {
          hasNextPage
          endCursor
        }

        edges {
          cursor
          node {
            id
            body
            state
            submittedAt
            author {
              login
              avatarUrl
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
    return {...prevVars, totalCount};
  },
  getVariables(props, {count, cursor}) {
    return {
      url: props.pullRequest.url,
      reviewCount: count,
      reviewCursor: cursor,
    };
  },
  query: graphql`
    query reviewSummariesAccumulatorQuery(
      $url: URI!
      $reviewCount: Int!
      $reviewCursor: String
    ) {
      resource(url: $url) {
        ... on PullRequest {
          ...reviewSummariesAccumulator_pullRequest @arguments(
            reviewCount: $reviewCount
            reviewCursor: $reviewCursor
          )
        }
      }
    }
  `,
});
