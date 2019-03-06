import React from 'react';
import {shallow} from 'enzyme';

import {BareReviewThreadsAccumulator} from '../../../lib/containers/accumulators/review-threads-accumulator';
import {pullRequestBuilder} from '../../builder/pr';

describe('ReviewThreadsAccumulator', function() {
  function buildApp(opts = {}) {
    const options = {
      buildPullRequest: () => {},
      props: {},
      ...opts,
    };

    const builder = pullRequestBuilder();
    options.buildPullRequest(builder);

    const props = {
      relay: {
        hasMore: () => false,
        loadMore: () => {},
        isLoading: () => false,
      },
      pullRequest: builder.build(),
      ...options.props,
    };

    return <BareReviewThreadsAccumulator {...props} />;
  }

  it('passes reviewThreads as its result batch', function() {
    function buildPullRequest(b) {
      b.addReviewThread(t => {
        t.addComment(c => c.id(10));
        t.addComment(c => c.id(11));
      });
      b.addReviewThread(t => {
        t.addComment(c => c.id(20));
        t.addComment(c => c.id(21));
        t.addComment(c => c.id(22));
      });
    }

    const wrapper = shallow(buildApp({buildPullRequest}));

    const reviewThreads = wrapper.find('Accumulator').prop('resultBatch');
    assert.deepEqual(
      reviewThreads[0].comments.edges.map(e => e.node.id),
      [10, 11],
    );
    assert.deepEqual(
      reviewThreads[1].comments.edges.map(e => e.node.id),
      [20, 21, 22],
    );
  });

  it('renders a ReviewCommentsAccumulator for each reviewThread', function() {
    function buildPullRequest(b) {
      b.addReviewThread(t => {
        t.addComment(c => c.id(10));
        t.addComment(c => c.id(11));
      });
      b.addReviewThread(t => {
        t.addComment(c => c.id(20));
        t.addComment(c => c.id(21));
        t.addComment(c => c.id(22));
      });
    }

    const wrapper = shallow(buildApp({buildPullRequest}));
    const reviewCommentsAccumulators = wrapper.find('ReviewCommentsAccumulator');
  });

  it('handles an error from the thread query results');

  it('handles the arrival of thread results');

  it('handles errors from each ReviewCommentsAccumulator');

  it('handles comment results from each ReviewCommentsAccumulator');

  it('reports loading while the thread query has more results');

  it('reports loading before any ReviewCommentsAccumulator results arrive');

  it('reports loading while any ReviewCommentsAccumulator results are loading');
});
