import React from 'react';
import {shallow} from 'enzyme';

import ReviewsView from '../../lib/views/reviews-view';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';

describe('ReviewsView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

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
    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder().build();
    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(BareAggregatedReviewsContainer))')
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-emptyState'), 1);
  });

  it('renders summary and comment sections', function() {
    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder()
      .addReviewSummary(r => r.id(0))
      .addReviewThread(t => t.addComment(c => c.id(1)))
      .addReviewThread(t => t.addComment(c => c.id(2)))
      .build();

    const wrapper = shallow(buildApp())
      .find('ForwardRef(Relay(BareAggregatedReviewsContainer))')
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 1);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 1);
    assert.lengthOf(wrapper.find('.github-ReviewSummary'), 1);
    assert.lengthOf(wrapper.find('details.github-Review'), 2);
  });

  it('renders reviews with correct data');

  describe('checkout button', function() {
    it('triggers checkout op on click');
    it('is disabled when checkout state is disabled');
  });

  describe('comment threads', function() {
    it('renders progress bar');
    it('renders comment threads');
    it('renders a PatchPreviewView per comment thread');
    describe('navigation buttons', function() {
      it('opens PR diff view and navigate to comment when "Open Diff" is clicked');
      it('opens file on disk and navigate to the commented line when "Jump To File" is clicked');
      it('"Jump To File" button is disabled with tooltip when PR is not checked out');
    });
  });

});
