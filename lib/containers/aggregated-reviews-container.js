import React, {Fragment} from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import moment from 'moment';

import {PAGE_SIZE} from '../helpers';
import ReviewSummariesAccumulator from './accumulators/review-summaries-accumulator';
import ReviewThreadsAccumulator from './accumulators/review-threads-accumulator';

export class BareAggregatedReviewsContainer extends React.Component {
  static propTypes = {
    // Relay response
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }),

    // Relay results.
    pullRequest: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }).isRequired,

    // Render prop. Called with {errors, summaries, commentThreads, loading}.
    children: PropTypes.func,

    // Callback called with {errors, summaries, commentThreads, loading} outside of the render cycle.
    handleResults: PropTypes.func,

    // Called right after refetch happens
    onDidRefetch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    children: () => null,
    handleResults: () => null,
  }

  constructor(props) {
    super(props);

    this.state = {
      errors: [],
      summaries: [],
      commentThreads: [],
      summariesLoading: true,
      threadsLoading: true,
    };
  }

  componentDidMount() {
    this.props.handleResults(this.getPayload());
  }

  render() {
    const summaries = this.props.summariesRenderer ?
      (<ReviewSummariesAccumulator
        pullRequest={this.props.pullRequest}
        onDidRefetch={this.props.onDidRefetch}>
        {this.props.summariesRenderer}
      </ReviewSummariesAccumulator>) : null;

    return (
      <Fragment>
        {this.props.children({errors: [], commentThreads: [], summaries})}
      </Fragment>
    );
  }

  handleSummaryResults = (err, summaries, loading) => {
    this.setState(prevState => {
      summaries.sort((a, b) => moment(a.submittedAt, moment.ISO_8601) - moment(b.submittedAt, moment.ISO_8601));

      return {
        errors: err !== null ? [...prevState.errors, err] : prevState.errors,
        summaries,
        summariesLoading: loading,
      };
    }, () => this.props.handleResults(this.getPayload()));
  }

  handleThreadResults = (errs, threads, commentsByThread, loading) => {
    this.setState(prevState => {
      const commentThreads = threads.map(thread => {
        return {thread, comments: commentsByThread.get(thread)};
      });

      return {
        errors: [...prevState.errors, ...errs.filter(err => err != null)],
        commentThreads,
        threadsLoading: loading,
      };
    }, () => this.props.handleResults(this.getPayload()));
  }

  refetch = callback => {
    this.props.relay.refetch({
      prId: this.props.pullRequest.id,
      reviewCount: PAGE_SIZE,
      reviewCursor: null,
      threadCount: PAGE_SIZE,
      threadCursor: null,
      commentCount: PAGE_SIZE,
      commentCursor: null,
    }, null, callback, {force: true});
  }

  getPayload() {
    return {
      errors: this.state.errors,
      summaries: this.state.summaries,
      commentThreads: this.state.commentThreads,
      loading: this.state.summariesLoading || this.state.threadsLoading,
      refetch: this.refetch,
    };
  }
}

export default createRefetchContainer(BareAggregatedReviewsContainer, {
  pullRequest: graphql`
    fragment aggregatedReviewsContainer_pullRequest on PullRequest
    @argumentDefinitions(
      reviewCount: {type: "Int!"}
      reviewCursor: {type: "String"}
      threadCount: {type: "Int!"}
      threadCursor: {type: "String"}
      commentCount: {type: "Int!"}
      commentCursor: {type: "String"}
    ) {
      id
      ...reviewSummariesAccumulator_pullRequest @arguments(
        reviewCount: $reviewCount
        reviewCursor: $reviewCursor
      )
      ...reviewThreadsAccumulator_pullRequest @arguments(
        threadCount: $threadCount
        threadCursor: $threadCursor
        commentCount: $commentCount
        commentCursor: $commentCursor
      )
    }
  `,
}, graphql`
  query aggregatedReviewsContainerRefetchQuery
  (
    $prId: ID!
    $reviewCount: Int!
    $reviewCursor: String
    $threadCount: Int!
    $threadCursor: String
    $commentCount: Int!
    $commentCursor: String
  ) {
    pullRequest: node(id: $prId) {
      ...prCheckoutController_pullRequest
      ...aggregatedReviewsContainer_pullRequest @arguments(
        reviewCount: $reviewCount
        reviewCursor: $reviewCursor
        threadCount: $threadCount
        threadCursor: $threadCursor
        commentCount: $commentCount
        commentCursor: $commentCursor
      )
    }
  }
`);
