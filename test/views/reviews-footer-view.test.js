import React from 'react';
import {shallow} from 'enzyme';

import ReviewsFooterView from '../../lib/views/reviews-footer-view';

describe('ReviewsFooterView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      commentsResolved: 3,
      totalComments: 4,
      openReviews: () => {},
      ...override,
    };

    return <ReviewsFooterView {...props} />;
  }

  it('renders the resolved and total comment counts', function() {
    const wrapper = shallow(buildApp({commentsResolved: 4, totalComments: 7}));

    assert.strictEqual(wrapper.find('.github-ReviewsFooterView-commentsResolved').text(), '4');
    assert.strictEqual(wrapper.find('.github-ReviewsFooterView-totalComments').text(), '7');
    assert.strictEqual(wrapper.find('.github-ReviewsFooterView-progessBar').prop('value'), 4);
    assert.strictEqual(wrapper.find('.github-ReviewsFooterView-progessBar').prop('max'), 7);
  });

  it('triggers openReviews on button click', function() {
    const openReviews = sinon.spy();
    const wrapper = shallow(buildApp({openReviews}));

    wrapper.find('.github-ReviewsFooterView-openReviewsButton').simulate('click');

    assert.isTrue(openReviews.called);
  });
});
