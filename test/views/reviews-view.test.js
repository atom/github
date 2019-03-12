import React from 'react';
import {shallow} from 'enzyme';

import ReviewsView from '../../lib/views/reviews-view';

describe('ReviewsView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

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
      ...override,
    };

    return <ReviewsView {...props} />;
  }

  it('renders a PullRequestsReviewsContainer', function() {
    const wrapper = shallow(buildApp());
    assert.lengthOf(wrapper.find('ForwardRef(Relay(PullRequestReviewsController))'), 1);
  });

  it('does not render empty summary or comment sections', function() {
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(PullRequestReviewsController))')
      .renderProp('children')({reviews: [], commentThreads: []});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 0);
  });

  it('renders summary and comment sections', function() {
    const {reviews, commentThreads} = mocks;
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(PullRequestReviewsController))')
      .renderProp('children')({reviews, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 1);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 1);
  });


});
