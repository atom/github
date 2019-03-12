import React from 'react';
import {shallow} from 'enzyme';

import {BareReviewSummariesAccumulator} from '../../../lib/containers/accumulators/review-summaries-accumulator';
import {pullRequestBuilder} from '../../builder/graphql/pr';

import pullRequestQuery from '../../../lib/containers/accumulators/__generated__/reviewSummariesAccumulator_pullRequest.graphql.js';

describe('ReviewSummariesAccumulator', function() {
  function buildApp(opts = {}) {
    const options = {
      buildPullRequest: () => {},
      props: {},
      ...opts,
    };

    const builder = pullRequestBuilder(pullRequestQuery);
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

    return <BareReviewSummariesAccumulator {...props} />;
  }

  it('passes pull request reviews as its result batches', function() {
    function buildPullRequest(b) {
      b.reviews(conn => {
        conn.addEdge(e => e.node(r => r.id(0)));
        conn.addEdge(e => e.node(r => r.id(1)));
        conn.addEdge(e => e.node(r => r.id(3)));
      });
    }

    const wrapper = shallow(buildApp({buildPullRequest}));

    assert.deepEqual(
      wrapper.find('Accumulator').prop('resultBatch').map(each => each.id),
      [0, 1, 3],
    );
  });

  it('passes a children render prop', function() {
    const fn = sinon.spy();
    const wrapper = shallow(buildApp({props: {children: fn}}));

    assert.strictEqual(wrapper.find('Accumulator').prop('children'), fn);
  });

  it('passes a result handler function', function() {
    const fn = sinon.spy();
    const wrapper = shallow(buildApp({props: {handleResults: fn}}));

    assert.strictEqual(wrapper.find('Accumulator').prop('handleResults'), fn);
  });
});
