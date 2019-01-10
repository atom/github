import React from 'react';
import {shallow} from 'enzyme';

import {PAGE_SIZE, PAGINATION_WAIT_TIME_MS} from '../../lib/helpers';

import {BarePullRequestReviewCommentsContainer} from '../../lib/containers/pr-review-comments-container';

describe('PullRequestReviewCommentsContainer', function() {
  const review = {
    id: '123',
    submittedAt: '2018-12-27T20:40:55Z',
    comments: {edges: ['this kiki is marvelous']},
  };

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
      review,
      ...overrideProps,
    };
    return <BarePullRequestReviewCommentsContainer {...props} />;
  }

  it('collects the comments after component has been mounted', function() {
    const collectCommentsStub = sinon.stub();
    shallow(buildApp({}, {collectComments: collectCommentsStub}));
    assert.strictEqual(collectCommentsStub.callCount, 1);

    const {submittedAt, comments, id} = review;
    assert.deepEqual(collectCommentsStub.lastCall.args[0], {
      reviewId: id,
      submittedAt,
      comments,
      fetchingMoreComments: false,
    });
  });

  it('attempts to load comments after component has been mounted', function() {
    const wrapper = shallow(buildApp());
    sinon.stub(wrapper.instance(), '_attemptToLoadMoreComments');
    wrapper.instance().componentDidMount();
    assert.strictEqual(wrapper.instance()._attemptToLoadMoreComments.callCount, 1);
  });

  describe('_loadMoreComments', function() {
    it('calls this.props.relay.loadMore with correct args', function() {
      const relayLoadMoreStub = sinon.stub();
      const wrapper = shallow(buildApp({relayLoadMore: relayLoadMoreStub}));
      wrapper.instance()._loadMoreComments();

      assert.deepEqual(relayLoadMoreStub.lastCall.args, [PAGE_SIZE, wrapper.instance().accumulateComments]);
    });
  });

  describe('accumulateComments', function() {
    it('collects comments and attempts to load more comments', function() {
      const collectCommentsStub = sinon.stub();
      const wrapper = shallow(buildApp({}, {collectComments: collectCommentsStub}));
      // collect comments is called when mounted, we don't care about that in this test so reset the count
      collectCommentsStub.reset();
      sinon.stub(wrapper.instance(), '_attemptToLoadMoreComments');
      wrapper.instance().accumulateComments();

      assert.strictEqual(collectCommentsStub.callCount, 1);

      const {submittedAt, comments, id} = review;
      assert.deepEqual(collectCommentsStub.lastCall.args[0], {
        reviewId: id,
        submittedAt,
        comments,
        fetchingMoreComments: false,
      });
    });
  });

  describe('attemptToLoadMoreComments', function() {
    let clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock = sinon.restore();
    });

    it('does not call loadMore if hasMore is false', function() {
      const relayLoadMoreStub = sinon.stub();
      const wrapper = shallow(buildApp({relayLoadMore: relayLoadMoreStub}));
      relayLoadMoreStub.reset();

      wrapper.instance()._attemptToLoadMoreComments();
      assert.strictEqual(relayLoadMoreStub.callCount, 0);
    });

    it('calls loadMore immediately if hasMore is true and isLoading is false', function() {
      const relayLoadMoreStub = sinon.stub();
      const relayHasMore = () => { return true; };
      const wrapper = shallow(buildApp({relayHasMore, relayLoadMore: relayLoadMoreStub}));
      relayLoadMoreStub.reset();

      wrapper.instance()._attemptToLoadMoreComments();
      assert.strictEqual(relayLoadMoreStub.callCount, 1);
      assert.deepEqual(relayLoadMoreStub.lastCall.args, [PAGE_SIZE, wrapper.instance().accumulateComments]);
    });

    it('calls loadMore after a timeout if hasMore is true and isLoading is true', function() {
      const relayLoadMoreStub = sinon.stub();
      const relayHasMore = () => { return true; };
      const relayIsLoading = () => { return true; };
      const wrapper = shallow(buildApp({relayHasMore, relayIsLoading, relayLoadMore: relayLoadMoreStub}));
      // advancing the timer and resetting the stub to clear the initial calls of
      // _attemptToLoadMoreComments when the component is initially mounted.
      clock.tick(PAGINATION_WAIT_TIME_MS);
      relayLoadMoreStub.reset();

      wrapper.instance()._attemptToLoadMoreComments();
      assert.strictEqual(relayLoadMoreStub.callCount, 0);

      clock.tick(PAGINATION_WAIT_TIME_MS);
      assert.strictEqual(relayLoadMoreStub.callCount, 1);
      assert.deepEqual(relayLoadMoreStub.lastCall.args, [PAGE_SIZE, wrapper.instance().accumulateComments]);
    });
  });
});
