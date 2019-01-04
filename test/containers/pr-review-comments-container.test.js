import React from 'react';
import {shallow} from 'enzyme';

import {PAGE_SIZE} from '../../lib/helpers';

import {BarePullRequestReviewCommentsContainer} from '../../lib/containers/pr-review-comments-container';

describe('PullRequestReviewCommentsContainer', function() {
  function buildApp(opts, overrideProps = {}) {
    const o = {
      relayHasMore: () => { return false; },
      relayLoadMore: () => {},
      relayIsLoading: () => { return false; },
      ...opts,
    };

    const props = {
      relay: {
        hasMore: o.relayHasMore,
        loadMore: o.relayLoadMore,
        isLoading: o.relayIsLoading,
      },
      collectComments: () => {},
      review: {
        id: '123',
        submittedAt: '2018-12-27T20:40:55Z',
        comments: {edges: ['this kiki is marvelous']},
      },
      ...overrideProps,
    };
    return <BarePullRequestReviewCommentsContainer {...props} />;
  }
  it('collects the comments after component has been mounted', function() {
    const collectCommentsStub = sinon.stub();
    shallow(buildApp({}, {collectComments: collectCommentsStub}));
    assert.strictEqual(collectCommentsStub.callCount, 1);
    const args = collectCommentsStub.lastCall.args[0];

    assert.strictEqual(args.reviewId, '123');
    assert.strictEqual(args.submittedAt, '2018-12-27T20:40:55Z');
    assert.deepEqual(args.comments, {edges: ['this kiki is marvelous']});
    assert.isFalse(args.hasMore);
  });

  it('attempts to load comments after component has been mounted', function() {
    const wrapper = shallow(buildApp());
    sinon.stub(wrapper.instance(), '_attemptToLoadMoreComments');
    wrapper.instance().componentDidMount();
    assert.strictEqual(wrapper.instance()._attemptToLoadMoreComments.callCount, 1);
  });


  describe('loadMoreComments', function() {
    it('calls this.props.relay.loadMore with correct args', function() {
      const relayLoadMoreStub = sinon.stub();
      const wrapper = shallow(buildApp({relayLoadMore: relayLoadMoreStub}));
      wrapper.instance()._loadMoreComments();

      const args = relayLoadMoreStub.lastCall.args;
      assert.strictEqual(args[0], PAGE_SIZE);
      assert.strictEqual(args[1], wrapper.instance().onDidLoadMore);
    });
  });

  describe('onDidLoadMore', function() {
    it('collects comments and attempts to load more comments', function() {
      const collectCommentsStub = sinon.stub();
      const wrapper = shallow(buildApp({}, {collectComments: collectCommentsStub}));
      // collect comments is called when mounted, we don't care about that in this test so reset the count
      collectCommentsStub.reset();
      sinon.stub(wrapper.instance(), '_attemptToLoadMoreComments');
      wrapper.instance().onDidLoadMore();

      assert.strictEqual(collectCommentsStub.callCount, 1);
      const args = collectCommentsStub.lastCall.args[0];

      assert.strictEqual(args.reviewId, '123');
      assert.strictEqual(args.submittedAt, '2018-12-27T20:40:55Z');
      assert.deepEqual(args.comments, {edges: ['this kiki is marvelous']});
      assert.isFalse(args.hasMore);
    });

    it('handles errors', function() {

    });


  });


  describe('attemptToLoadMoreComments', function() {
    it('does not call loadMore if hasMore prop is falsy', function() {
    });

    it('calls loadMore immediately if not already loading more', function() {
    });

    it('if already loading more, calls loadMore after a timeout', function() {
    });

  });

});
