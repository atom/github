import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {graphql, createPaginationContainer} from 'react-relay';

import {PAGE_SIZE, PAGINATION_WAIT_TIME_MS} from '../../helpers';
import {RelayConnectionPropType} from '../../prop-types';
import Accumulator from './accumulator';
import ReviewCommentsAccumulator from './review-comments-accumulator';

export class BareReviewThreadsAccumulator extends React.Component {
  static propTypes = {
    // Relay props
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
    pullRequest: PropTypes.shape({
      reviewThreads: RelayConnectionPropType(
        PropTypes.object,
      ),
    }),

    // Render prop. Called with (array of errors, array of threads, map of comments per thread, loading)
    children: PropTypes.func,

    // Non-render prop. Called with (array of errors, array of threads, map of comments per thread, loading)
    handleResults: PropTypes.func,
  }

  static defaultProps = {
    children: () => null,
    handleResults: () => {},
  }

  constructor(props) {
    super(props);

    this.state = {
      errors: [],
      threads: [],
      commentsByThread: new Map(),
      loadingByThread: new Map(),
    };
  }

  render() {
    const resultBatch = this.props.pullRequest.reviewThreads.edges.map(edge => edge.node);

    return (
      <Fragment>
        <Accumulator
          relay={this.props.relay}
          resultBatch={resultBatch}
          handleResults={this.handleThreadResults}
          pageSize={PAGE_SIZE}
          waitTimeMs={PAGINATION_WAIT_TIME_MS}>
          {this.renderReviewThreads}
        </Accumulator>
        {this.props.children(this.state.errors, this.state.threads, this.state.commentsByThread, this.anyLoading())}
      </Fragment>
    );
  }

  renderReviewThreads = (err, threads) => {
    if (err) {
      return null;
    }

    return threads.map(thread => (
      <ReviewCommentsAccumulator
        key={`review-comments-${thread.id}`}
        reviewThread={thread}
        handleResults={(subError, comments, loading) => this.handleCommentResults(subError, thread, comments, loading)}
      />
    ));
  }

  handleThreadResults = (err, threads) => {
    this.setState(prevState => {
      for (const thread of threads) {
        if (!prevState.commentsByThread.has(thread)) {
          prevState.commentsByThread.set(thread, []);
        }
        if (!prevState.loadingByThread.has(thread)) {
          prevState.loadingByThread.set(thread, true);
        }
      }

      return {
        errors: err !== null ? [...prevState.errors, err] : prevState.errors,
        threads,
      };
    }, () => {
      this.props.handleResults(this.state.errors, this.state.threads, this.state.commentsByThread, this.anyLoading());
    });
  }

  handleCommentResults(err, thread, comments, loading) {
    this.setState(prevState => {
      prevState.loadingByThread.set(thread, loading);
      prevState.commentsByThread.set(thread, comments);

      return {errors: err !== null ? [...prevState.errors, err] : prevState.errors};
    }, () => {
      this.props.handleResults(this.state.errors, this.state.threads, this.state.commentsByThread, this.anyLoading());
    });
  }

  anyLoading() {
    return this.props.relay.hasMore() || Array.from(this.state.loadingByThread.values()).some(Boolean);
  }
}

export default createPaginationContainer(BareReviewThreadsAccumulator, {
  pullRequest: graphql`
    fragment reviewThreadsAccumulator_pullRequest on PullRequest
    @argumentDefinitions(
      threadCount: {type: "Int!"}
      threadCursor: {type: "String"}
      commentCount: {type: "Int!"}
      commentCursor: {type: "String"}
    ) {
      url
      reviewThreads(
        first: $threadCount
        after: $threadCursor
      ) @connection(key: "ReviewThreadsAccumulator_reviewThreads") {
        pageInfo {
          hasNextPage
          endCursor
        }

        edges {
          cursor
          node {
            id
            isResolved

            ...reviewCommentsAccumulator_reviewThread @arguments(
              commentCount: $commentCount
              commentCursor: $commentCursor
            )
          }
        }
      }
    }
  `,
}, {
  direction: 'forward',
  /* istanbul ignore next */
  getConnectionFromProps(props) {
    return props.pullRequest.reviewThreads;
  },
  /* istanbul ignore next */
  getFragmentVariables(prevVars, totalCount) {
    return {...prevVars, totalCount};
  },
  /* istanbul ignore next */
  getVariables(props, {count, cursor}, fragmentVariables) {
    return {
      url: props.pullRequest.url,
      threadCount: count,
      threadCursor: cursor,
      commentCount: fragmentVariables.commentCount,
    };
  },
  query: graphql`
    query reviewThreadsAccumulatorQuery(
      $url: URI!
      $threadCount: Int!
      $threadCursor: String
      $commentCount: Int!
    ) {
      resource(url: $url) {
        ... on PullRequest {
          ...reviewThreadsAccumulator_pullRequest @arguments(
            threadCount: $threadCount
            threadCursor: $threadCursor
            commentCount: $commentCount
          )
        }
      }
    }
  `,
});
