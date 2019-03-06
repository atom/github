import React from 'react';
import {shallow} from 'enzyme';

import {BareReviewThreadsAccumulator} from '../../../lib/containers/accumulators/review-threads-accumulator';
import ReviewCommentsAccumulator from '../../../lib/containers/accumulators/review-comments-accumulator';
import {pullRequestBuilder} from '../../builder/pr';

describe('ReviewThreadsAccumulator', function() {
  function buildApp(opts = {}) {
    const options = {
      pullRequest: pullRequestBuilder().build(),
      props: {},
      ...opts,
    };

    const props = {
      relay: {
        hasMore: () => false,
        loadMore: () => {},
        isLoading: () => false,
      },
      pullRequest: options.pullRequest,
      ...options.props,
    };

    return <BareReviewThreadsAccumulator {...props} />;
  }

  it('passes reviewThreads as its result batch', function() {
    const pullRequest = pullRequestBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(10));
        t.addComment(c => c.id(11));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(20));
        t.addComment(c => c.id(21));
        t.addComment(c => c.id(22));
      })
      .build();

    const wrapper = shallow(buildApp({pullRequest}));

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

  it('handles an error from the thread query results', function() {
    const err = new Error('oh no');
    const handleResults = sinon.spy();

    const wrapper = shallow(buildApp({props: {handleResults}}));
    const children = wrapper.find('Accumulator').renderProp('children')(err, [], false);
    assert.isTrue(children.isEmptyRender());

    wrapper.find('Accumulator').prop('handleResults')(err, [], false);
    assert.isTrue(handleResults.calledWith([err], [], new Map(), false));
  });

  it('renders a ReviewCommentsAccumulator for each reviewThread', function() {
    const pullRequest = pullRequestBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(10));
        t.addComment(c => c.id(11));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(20));
        t.addComment(c => c.id(21));
        t.addComment(c => c.id(22));
      })
      .build();
    const handleResults = sinon.spy();
    const reviewThreads = pullRequest.reviewThreads.edges.map(e => e.node);

    const wrapper = shallow(buildApp({pullRequest, props: {handleResults}}));

    const args = [null, wrapper.find('Accumulator').prop('resultBatch'), false];
    const subwrapper = wrapper.find('Accumulator').renderProp('children')(...args);

    const commentAccumulators = subwrapper.find(ReviewCommentsAccumulator);
    assert.strictEqual(commentAccumulators.at(0).prop('reviewThread'), reviewThreads[0]);
    assert.strictEqual(commentAccumulators.at(1).prop('reviewThread'), reviewThreads[1]);

    wrapper.find('Accumulator').prop('handleResults')(...args);

    assert.isTrue(handleResults.calledWith(
      [], reviewThreads, new Map(reviewThreads.map(t => [t, []])), true,
    ));
  });

  it('handles the arrival of additional review thread batches', function() {
    const pr0 = pullRequestBuilder()
      .addReviewThread()
      .addReviewThread()
      .build();

    const handleResults = sinon.spy();
    const children = sinon.stub().returns(null);
    const batch0 = pr0.reviewThreads.edges.map(e => e.node);

    const wrapper = shallow(buildApp({pullRequest: pr0, props: {handleResults, children}}));
    wrapper.find('Accumulator').renderProp('children')(null, batch0, true);
    wrapper.find('Accumulator').prop('handleResults')(null, batch0, true);

    const map0 = new Map([
      [batch0[0], []], [batch0[1], []],
    ]);
    assert.isTrue(handleResults.calledWith([], batch0, map0, true));
    assert.isTrue(children.calledWith([], batch0, map0, true));
    handleResults.resetHistory();
    children.resetHistory();

    const pr1 = pullRequestBuilder()
      .addReviewThread()
      .addReviewThread()
      .addReviewThread()
      .build();
    const batch1 = pr1.reviewThreads.edges.map(e => e.node);

    wrapper.setProps({pullRequest: pr1});
    wrapper.find('Accumulator').renderProp('children')(null, [...batch0, ...batch1], true);
    wrapper.find('Accumulator').prop('handleResults')(null, [...batch0, ...batch1], true);

    const map1 = new Map([
      [batch0[0], []], [batch0[1], []],
      [batch1[0], []], [batch1[1], []], [batch1[2], []],
    ]);
    assert.isTrue(handleResults.calledWith([], [...batch0, ...batch1], map1, true));
    assert.isTrue(children.calledWith([], [...batch0, ...batch1], map1, true));
    handleResults.resetHistory();
    children.resetHistory();

    const pr2 = pullRequestBuilder()
      .addReviewThread()
      .build();
    const batch2 = pr2.reviewThreads.edges.map(e => e.node);

    wrapper.setProps({pullRequest: pr2});
    wrapper.find('Accumulator').renderProp('children')(null, [...batch0, ...batch1, ...batch2], false);
    wrapper.find('Accumulator').prop('handleResults')(null, [...batch0, ...batch1, ...batch2], false);

    const map2 = new Map([
      [batch0[0], []], [batch0[1], []],
      [batch1[0], []], [batch1[1], []], [batch1[2], []],
      [batch2[0], []],
    ]);

    assert.isTrue(handleResults.calledWith([], [...batch0, ...batch1, ...batch2], map2, true));
    assert.isTrue(children.calledWith([], [...batch0, ...batch1, ...batch2], map2, true));
  });

  it('handles errors from each ReviewCommentsAccumulator', function() {
    const pullRequest = pullRequestBuilder()
      .addReviewThread()
      .addReviewThread()
      .build();
    const batch = pullRequest.reviewThreads.edges.map(e => e.node);

    const handleResults = sinon.spy();
    const children = sinon.stub().returns(null);
    const wrapper = shallow(buildApp({pullRequest, props: {handleResults, children}}));

    const subwrapper = wrapper.find('Accumulator').renderProp('children')(null, batch, false);
    wrapper.find('Accumulator').prop('handleResults')(null, batch, false);

    const commentAccumulators = subwrapper.find(ReviewCommentsAccumulator);

    const error1 = new Error('oh shit');
    commentAccumulators.at(1).prop('handleResults')(error1, [], false);

    const map = new Map([
      [[batch[0], []], [batch[1], []]],
    ]);
    assert.isTrue(handleResults.calledWith([error1], batch, map, true));
    assert.isTrue(children.calledWith([error1], batch, map, true));

    const error0 = new Error('wat');
    commentAccumulators.at(0).prop('handleResults')(error0, [], false);

    assert.isTrue(handleResults.calledWith([error1, error0], batch, map, false));
    assert.isTrue(children.calledWith([error1, error0], batch, map, false));
  });

  it('handles comment results from each ReviewCommentsAccumulator', function() {
    const pr0 = pullRequestBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(0));
        t.addComment(c => c.id(1));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(10));
      })
      .build();
    const batch0 = pr0.reviewThreads.edges.map(e => e.node);
    const b0comments0 = batch0[0].comments.edges.map(e => e.node);
    const b0comments1 = batch0[1].comments.edges.map(e => e.node);

    const handleResults = sinon.spy();
    const children = sinon.stub().returns(null);
    const wrapper = shallow(buildApp({pullRequest: pr0, props: {handleResults, children}}));

    const subwrapper0 = wrapper.find('Accumulator').renderProp('children')(null, batch0, false);
    wrapper.find('Accumulator').prop('handleResults')(null, batch0, false);
    const commentAccs0 = subwrapper0.find(ReviewCommentsAccumulator);

    commentAccs0.at(1).prop('handleResults')(null, b0comments1, false);

    const map0 = new Map([
      [batch0[0], []],
      [batch0[1], b0comments1],
    ]);
    assert.isTrue(handleResults.calledWith([], batch0, map0, true));
    assert.isTrue(children.calledWith([], batch0, map0, true));

    commentAccs0.at(0).prop('handleResults')(null, b0comments0, false);

    const map1 = new Map([
      [batch0[0], b0comments0],
      [batch0[1], b0comments1],
    ]);
    assert.isTrue(handleResults.calledWith([], batch0, map1, false));
    assert.isTrue(children.calledWith([], batch0, map1, false));
  });
});
