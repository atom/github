import React from 'react';
import {shallow} from 'enzyme';

import ReviewsView from '../../lib/views/reviews-view';

describe('ReviewsView', function() {
  let atomEnv;

  const mockReview = {
    state: 'APPROVED',
    author: {avatarUrl: ''},
    login: {login: 'Monkey King'},
    submittedAt: new Date(),
    body: 'wow such changes!',
  };

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      repository: {
        pullRequest: {}
      },
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
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(PullRequestReviewsController))')
      .renderProp('children')({reviews: [mockReview], commentThreads: [{}]});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 1);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 1);
  });


});
