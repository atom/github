import React from 'react';
import {shallow} from 'enzyme';
import sinon from 'sinon';

import ReviewsView from '../../lib/views/reviews-view';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';
import AggregatedReviewsContainer from '../../lib/containers/aggregated-reviews-container';
import {checkoutStates} from '../../lib/controllers/pr-checkout-controller';
import EnableableOperation from '../../lib/models/enableable-operation';

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
      checkoutOp: new EnableableOperation(() => {}).disable(checkoutStates.CURRENT),
      contextLines: 4,
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
          c.id(0).path('dir/file0').position(10).bodyHTML('i have opinions.').author(a => a.login('user0').avatarUrl('user0.jpg')),
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

    it('renders threads with comments', function() {
      const threads = wrapper.find('details.github-Review');
      assert.lengthOf(threads, 3);
      assert.lengthOf(threads.at(0).find('.github-Review-comment'), 2);
      assert.lengthOf(threads.at(1).find('.github-Review-comment'), 1);
      assert.lengthOf(threads.at(2).find('.github-Review-comment'), 1);
    });

    describe('each thread', function() {
      it('displays correct data', function() {
        const thread = wrapper.find('details.github-Review').at(0);
        assert.strictEqual(thread.find('.github-Review-path').text(), 'dir');
        assert.strictEqual(thread.find('.github-Review-file').text(), '/file0');
        // TODO: FIX ME
        assert.strictEqual(thread.find('.github-Review-lineNr').text(), '10');
      });

      it('renders a PatchPreviewView per comment thread', function() {
        assert.isTrue(wrapper.find('details.github-Review').everyWhere(thread => thread.find('PatchPreviewView').length === 1));
        assert.include(wrapper.find('PatchPreviewView').at(0).props(), {
          fileName: 'dir/file0',
          diffRow: 10,
          maxRowCount: 4,
        });
      });

      describe('navigation buttons', function() {

        it('a pair of "Open Diff" and "Jump To File" buttons per thread', function() {
          assert.isTrue(wrapper.find('details.github-Review').everyWhere(thread =>
            thread.find('.github-Review-navButton.icon-code').length === 1 && thread.find('.github-Review-navButton.icon-diff').length === 1,
          ));
        });

        describe('when PR is checked out', function() {

          const openFile = sinon.spy();
          const openDiff = sinon.spy();

          beforeEach(function() {
            wrapper = shallow(buildApp({openFile, openDiff}))
              .find(AggregatedReviewsContainer)
              .renderProp('children')({errors, summaries, commentThreads});
          });

          it('calls openDiff with correct params when "Open Diff" is clicked', function() {
            wrapper.find('details.github-Review').at(0).find('.icon-diff').simulate('click', {currentTarget: {dataset: {path: 'dir/file0', line: 10}}});
            assert(openDiff.calledWith('dir/file0', 10));
          });

          it('calls openFile with correct params when when "Jump To File" is clicked', function() {
            wrapper.find('details.github-Review').at(0).find('.icon-code').simulate('click', {currentTarget: {dataset: {path: 'dir/file0', line: 10}}});
            assert(openFile.calledWith('dir/file0', 9));
          });
        });

        describe('when PR is not checked out', function() {

          const openFile = sinon.spy();

          beforeEach(function() {
            const checkoutOp = {isEnabled: () => true};
            wrapper = shallow(buildApp({openFile, checkoutOp}))
              .find(AggregatedReviewsContainer)
              .renderProp('children')({errors, summaries, commentThreads});
          });

          it('"Jump To File" button is disabled with tooltip when PR is not checked out');

          it('does not calls openFile when when "Jump To File" is clicked', function() {
            wrapper.find('details.github-Review').at(0).find('.icon-code').simulate('click', {currentTarget: {dataset: {path: 'dir/file0', line: 10}}});
            assert.isFalse(openFile.called);
          });

        });

      });

    });

    it('each comment displays correct data', function() {
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

  });

});
