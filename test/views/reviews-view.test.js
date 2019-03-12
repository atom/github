import React from 'react';
import {shallow} from 'enzyme';

import {pullRequestBuilder} from '../builder/pr';
import ReviewsView from '../../lib/views/reviews-view';

describe('ReviewsView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  // TODO: probably need to either refactor or fix this after the pullRequestBuilder implementation has settled
  function aggregatePullRequest(pullRequest, override = {}) {
    const reviewThreads = pullRequest.reviewThreads.edges.map(e => e.node);
    const summaries = pullRequest.reviews.edges.map(e => e.node);
    const commentThreads = reviewThreads.map(thread => {
      return {
        thread,
        comments: thread.comments.edges.map(e => e.node),
      };
    });
    return {summaries, commentThreads, errors: [], loading: false, ...override};
  }

  function buildApp(override = {}) {
    const props = {
      repository: {pullRequest: {}},
      checkoutOp: {
        isEnabled: () => true,
      },
      ...override,
    };

    return <ReviewsView {...props} />;
  }

  it('renders a BareAggregatedReviewsContainer', function() {
    const wrapper = shallow(buildApp());
    assert.lengthOf(wrapper.find('ForwardRef(Relay(BareAggregatedReviewsContainer))'), 1);
  });

  it('registers atom commands');

  it('renders empty state if there is no review', function() {
    const pr = pullRequestBuilder().build();
    const {errors, summaries, commentThreads} = aggregatePullRequest(pr);
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(BareAggregatedReviewsContainer))')
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-emptyState'), 1);
  });

  it('renders summary and comment sections', function() {
    const pr = pullRequestBuilder()
      .addReview(r => r.id(0))
      .addReviewThread(t => t.addComment(c => c.id(1)))
      .addReviewThread(t => t.addComment(c => c.id(2)))
      .build();
    const {errors, summaries, commentThreads} = aggregatePullRequest(pr);
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(BareAggregatedReviewsContainer))')
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 1);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 1);
    assert.lengthOf(wrapper.find('.github-ReviewSummary'), 1);
    assert.lengthOf(wrapper.find('details.github-Review'), 2);
  });


});
