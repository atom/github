import React from 'react';
import {shallow} from 'enzyme';

import {BareAggregatedReviewsContainer} from '../../lib/containers/aggregated-reviews-container';
import ReviewSummariesAccumulator from '../../lib/containers/accumulators/review-summaries-accumulator';
import ReviewThreadsAccumulator from '../../lib/containers/accumulators/review-threads-accumulator';
import {pullRequestBuilder, reviewThreadBuilder} from '../builder/graphql/pr';

import pullRequestQuery from '../../lib/containers/__generated__/aggregatedReviewsContainer_pullRequest.graphql.js';
import summariesQuery from '../../lib/containers/accumulators/__generated__/reviewSummariesAccumulator_pullRequest.graphql.js';
import threadsQuery from '../../lib/containers/accumulators/__generated__/reviewThreadsAccumulator_pullRequest.graphql.js';
import commentsQuery from '../../lib/containers/accumulators/__generated__/reviewCommentsAccumulator_reviewThread.graphql.js';

describe('AggregatedReviewsContainer', function() {
  function buildApp(override = {}) {
    const props = {
      pullRequest: pullRequestBuilder(pullRequestQuery).build(),
      ...override,
    };

    return <BareAggregatedReviewsContainer {...props} />;
  }

  it('reports errors from review summaries or review threads', function() {
    const children = sinon.stub().returns(null);
    const handleResults = sinon.spy();
    const wrapper = shallow(buildApp({children, handleResults}));

    assert.isTrue(children.calledWith({errors: [], summaries: [], commentThreads: [], loading: true}));
    assert.isTrue(handleResults.calledWith({errors: [], summaries: [], commentThreads: [], loading: true}));

    const summaryError = new Error('everything is on fire');
    wrapper.find(ReviewSummariesAccumulator).prop('handleResults')(summaryError, [], false);

    assert.isTrue(children.calledWith({errors: [summaryError], summaries: [], commentThreads: [], loading: true}));
    assert.isTrue(handleResults.calledWith({errors: [summaryError], summaries: [], commentThreads: [], loading: true}));

    const threadError0 = new Error('tripped over a power cord');
    const threadError1 = new Error('cosmic rays');
    wrapper.find(ReviewThreadsAccumulator).prop('handleResults')([threadError0, threadError1], [], new Map(), false);

    assert.isTrue(children.calledWith({
      errors: [summaryError, threadError0, threadError1],
      summaries: [],
      commentThreads: [],
      loading: false,
    }));

    assert.isTrue(handleResults.calledWith({
      errors: [summaryError, threadError0, threadError1],
      summaries: [],
      commentThreads: [],
      loading: false,
    }));
  });

  it('collects and sorts review summaries', function() {
    const pullRequest0 = pullRequestBuilder(summariesQuery)
      .reviews(conn => {
        conn.addEdge(e => e.node(r => r.id(0).submittedAt('2019-01-05T10:00:00Z')));
        conn.addEdge(e => e.node(r => r.id(1).submittedAt('2019-01-02T10:00:00Z')));
        conn.addEdge(e => e.node(r => r.id(2).submittedAt('2019-01-03T10:00:00Z')));
      })
      .build();
    const batch0 = pullRequest0.reviews.edges.map(e => e.node);

    const children = sinon.stub().returns(null);
    const handleResults = sinon.spy();
    const wrapper = shallow(buildApp({children, handleResults}));

    wrapper.find(ReviewSummariesAccumulator).prop('handleResults')(null, batch0.slice(), true);

    assert.isTrue(children.calledWith({
      errors: [],
      summaries: [batch0[1], batch0[2], batch0[0]],
      commentThreads: [],
      loading: true,
    }));
    assert.isTrue(handleResults.calledWith({
      errors: [],
      summaries: [batch0[1], batch0[2], batch0[0]],
      commentThreads: [],
      loading: true,
    }));

    const pullRequest1 = pullRequestBuilder(summariesQuery)
      .reviews(conn => {
        conn.addEdge(e => e.node(r => r.id(3).submittedAt('2019-01-07T10:00:00Z')));
        conn.addEdge(e => e.node(r => r.id(4).submittedAt('2019-01-01T10:00:00Z')));
      })
      .build();
    const batch1 = pullRequest1.reviews.edges.map(e => e.node);

    wrapper.find(ReviewSummariesAccumulator).prop('handleResults')(null, [...batch0.slice(), ...batch1.slice()], false);

    const payload = {
      errors: [],
      summaries: [batch1[1], batch0[1], batch0[2], batch0[0], batch1[0]],
      commentThreads: [],
      loading: true,
    };
    assert.isTrue(children.calledWith(payload));
    assert.isTrue(handleResults.calledWith(payload));
  });

  it('collects and aggregates review threads and comments', function() {
    const pullRequest = pullRequestBuilder(threadsQuery)
      .reviewThreads(conn => {
        conn.addEdge();
        conn.addEdge();
        conn.addEdge();
      })
      .build();

    const thread0 = reviewThreadBuilder(commentsQuery)
      .comments(conn => {
        conn.addEdge(e => e.node(c => c.id(10)));
        conn.addEdge(e => e.node(c => c.id(11)));
      })
      .build();

    const thread1 = reviewThreadBuilder(commentsQuery)
      .comments(conn => {
        conn.addEdge(e => e.node(c => c.id(20)));
      })
      .build();

    const thread2 = reviewThreadBuilder(commentsQuery)
      .comments(conn => {
        conn.addEdge(e => e.node(c => c.id(30)));
        conn.addEdge(e => e.node(c => c.id(31)));
        conn.addEdge(e => e.node(c => c.id(32)));
      })
      .build();

    const threads = pullRequest.reviewThreads.edges.map(e => e.node);
    const commentMap = new Map([
      [threads[0], thread0.comments.edges.map(e => e.node)],
      [threads[1], thread1.comments.edges.map(e => e.node)],
      [threads[2], thread2.comments.edges.map(e => e.node)],
    ]);

    const children = sinon.spy();
    const handleResults = sinon.spy();
    const wrapper = shallow(buildApp({pullRequest, children, handleResults}));

    wrapper.find(ReviewThreadsAccumulator).prop('handleResults')(
      [], threads, commentMap, false,
    );

    const payload = {
      errors: [],
      summaries: [],
      commentThreads: [
        {thread: threads[0], comments: thread0.comments.edges.map(e => e.node)},
        {thread: threads[1], comments: thread1.comments.edges.map(e => e.node)},
        {thread: threads[2], comments: thread2.comments.edges.map(e => e.node)},
      ],
      loading: true,
    };

    assert.isTrue(children.calledWith(payload));
    assert.isTrue(handleResults.calledWith(payload));
  });
});
