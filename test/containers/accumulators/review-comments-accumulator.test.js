import React from 'react';
import {shallow} from 'enzyme';

import {BareReviewCommentsAccumulator} from '../../../lib/containers/accumulators/review-comments-accumulator';
import {reviewThreadBuilder} from '../../builder/pr';

describe('ReviewCommentsAccumulator', function() {
  function buildApp(opts = {}) {
    const options = {
      buildReviewThread: () => {},
      props: {},
      ...opts,
    };

    const builder = reviewThreadBuilder();
    options.buildReviewThread(builder);

    const props = {
      relay: {
        hasMore: () => false,
        loadMore: () => {},
        isLoading: () => false,
      },
      reviewThread: builder.build(),
      ...options.props,
    };

    return <BareReviewCommentsAccumulator {...props} />;
  }

  it('passes the review thread comments as its result batch', function() {
    function buildReviewThread(b) {
      b.addComment(c => c.id(10));
      b.addComment(c => c.id(20));
      b.addComment(c => c.id(30));
    }

    const wrapper = shallow(buildApp({buildReviewThread}));

    assert.deepEqual(
      wrapper.find('Accumulator').prop('resultBatch').map(each => each.id),
      [10, 20, 30],
    );
  });

  it('passes a child render prop', function() {
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
