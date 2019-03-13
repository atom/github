import React from 'react';
import {shallow} from 'enzyme';

import ReviewsView from '../../lib/views/reviews-view';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';
import AggregatedReviewsContainer from '../../lib/containers/aggregated-reviews-container';

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
    assert.lengthOf(wrapper.find(AggregatedReviewsContainer), 1);
  });

  it('registers atom commands');

  it('renders empty state if there is no review', function() {
    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder().build();
    const wrapper = shallow(buildApp())
      .find(AggregatedReviewsContainer)
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-emptyState'), 1);
  });

  it('renders summary and comment sections', function() {
    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder()
      .addReviewSummary(r => r.id(0))
      .addReviewThread(t => t.addComment())
      .addReviewThread(t => t.addComment())
      .build();

    const wrapper = shallow(buildApp())
      .find(AggregatedReviewsContainer)
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

    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder()
      .addReviewSummary(r => r.id(0))
      .addReviewThread(t => {
        t.addComment(c =>
          c.id(0).path('file0').position(10).bodyHTML('i have opinions.').author(a => a.login('user0').avatarUrl('user0.jpg')),
        );
        t.addComment(c =>
          c.id(1).path('file0').position(10).bodyHTML('i disagree.').author(a => a.login('user1').avatarUrl('user1.jpg')),
        );
        return t;
      }).addReviewThread(
        t => t.addComment(c =>
          c.id(2).path('file1').position(20).bodyHTML('thanks for all the fish').author(a => a.login('dolphin').avatarUrl('pic-of-dolphin')),
        ),
      ).addReviewThread(t => {
        t.thread(t0 => t0.isResolved(true));
        t.addComment();
        return t;
      })
      .build();

    let wrapper;

    beforeEach(function() {
      wrapper = shallow(buildApp())
        .find(AggregatedReviewsContainer)
        .renderProp('children')({errors, summaries, commentThreads});
    });

    it('renders comment threads', function() {
      const threads = wrapper.find('details.github-Review');
      assert.lengthOf(threads, 3);
      assert.lengthOf(threads.at(0).find('.github-Review-comment'), 2);
      assert.lengthOf(threads.at(1).find('.github-Review-comment'), 1);
      assert.lengthOf(threads.at(2).find('.github-Review-comment'), 1);
    });

    it('each comment', function() {
      const comment = wrapper.find('.github-Review-comment').at(0);
      assert.strictEqual(comment.find('.github-Review-avatar').prop('src'), 'user0.jpg');
      assert.strictEqual(comment.find('.github-Review-avatar').prop('alt'), 'user0');
      assert.strictEqual(comment.find('.github-Review-username').prop('href'), 'https://github.com/user0');
      assert.strictEqual(comment.find('.github-Review-username').text(), 'user0');
      assert.strictEqual(comment.find('GithubDotcomMarkdown').prop('html'), 'i have opinions.');
    });

    it('renders progress bar', function() {
      assert.isTrue(wrapper.find('.github-Reviews-progress').exists());
      assert.strictEqual(wrapper.find('.github-Reviews-count').text(), 'Resolved 1 of 3');
      assert.include(wrapper.find('progress.github-Reviews-progessBar').props(), {value: 1, max: 3});
    });

    it('renders a PatchPreviewView per comment thread');

    describe('navigation buttons', function() {
      it('opens PR diff view and navigate to comment when "Open Diff" is clicked');
      it('opens file on disk and navigate to the commented line when "Jump To File" is clicked');
      it('"Jump To File" button is disabled with tooltip when PR is not checked out');
    });
  });

});
