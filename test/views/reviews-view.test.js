import React from 'react';
import {shallow} from 'enzyme';
import sinon from 'sinon';

import ReviewsView from '../../lib/views/reviews-view';
import AggregatedReviewsContainer from '../../lib/containers/aggregated-reviews-container';
import EnableableOperation from '../../lib/models/enableable-operation';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';
import {multiFilePatchBuilder} from '../builder/patch';
import {checkoutStates} from '../../lib/controllers/pr-checkout-controller';
import * as reporterProxy from '../../lib/reporter-proxy';

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
      relay: {environment: {}},
      repository: {},
      pullRequest: {},

      multiFilePatch: multiFilePatchBuilder().build().multiFilePatch,
      contextLines: 4,
      checkoutOp: new EnableableOperation(() => {}).disable(checkoutStates.CURRENT),
      summarySectionOpen: true,
      commentSectionOpen: true,
      threadIDsOpen: new Set(),

      number: 100,
      repo: 'github',
      owner: 'atom',
      workdir: __dirname,

      workspace: atomEnv.workspace,
      config: atomEnv.config,
      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,

      openFile: () => {},
      openDiff: () => {},
      openPR: () => {},
      moreContext: () => {},
      lessContext: () => {},
      openIssueish: () => {},
      showSummaries: () => {},
      hideSummaries: () => {},
      showComments: () => {},
      hideComments: () => {},
      showThreadID: () => {},
      hideThreadID: () => {},
      resolveThread: () => {},
      unresolveThread: () => {},
      addSingleComment: () => {},
      reportMutationErrors: () => {},
      ...override,
    };

    return <ReviewsView {...props} />;
  }

  it('renders an AggregatedReviewsContainer', function() {
    const wrapper = shallow(buildApp());
    assert.lengthOf(wrapper.find(AggregatedReviewsContainer), 1);
  });

  it('registers atom commands');

  it('renders empty state if there is no review', function() {
    sinon.stub(reporterProxy, 'addEvent');
    const {errors, summaries, commentThreads} = aggregatedReviewsBuilder().build();
    const wrapper = shallow(buildApp())
      .find(AggregatedReviewsContainer)
      .renderProp('children')({errors, summaries, commentThreads});
    assert.lengthOf(wrapper.find('.github-Reviews-section.summaries'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-section.comments'), 0);
    assert.lengthOf(wrapper.find('.github-Reviews-emptyState'), 1);

    wrapper.find('.github-Reviews-emptyCallToActionText').children().simulate('click');
    assert.isTrue(reporterProxy.addEvent.calledWith(
      'start-pr-review',
      {package: 'github', component: 'ReviewsView'},
    ));
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

  it('calls openIssueish when clicking on an issueish link in a review summary', function() {
    const openIssueish = sinon.spy();

    const {summaries} = aggregatedReviewsBuilder()
      .addReviewSummary(r => {
        r.bodyHTML('hey look a link <a href="https://github.com/aaa/bbb/pulls/123">#123</a>').id(0);
      })
      .build();

    const wrapper = shallow(buildApp({openIssueish}))
      .find(AggregatedReviewsContainer)
      .renderProp('children')({errors: [], summaries, commentThreads: []});

    wrapper.find('GithubDotcomMarkdown').prop('switchToIssueish')('aaa', 'bbb', 123);
    assert.isTrue(openIssueish.calledWith('aaa', 'bbb', 123));

    wrapper.find('GithubDotcomMarkdown').prop('openIssueishLinkInNewTab')({
      target: {dataset: {url: 'https://github.com/ccc/ddd/issues/654'}},
    });
    assert.isTrue(openIssueish.calledWith('ccc', 'ddd', 654));
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
          c.id(1).path('file0').position(10).bodyHTML('i disagree.').author(a => a.login('user1').avatarUrl('user1.jpg')).isMinimized(true),
        );
      }).addReviewThread(t => {
        t.addComment(c =>
          c.id(2).path('file1').position(20).bodyHTML('thanks for all the fish').author(a => a.login('dolphin').avatarUrl('pic-of-dolphin')),
        );
        t.addComment(c =>
          c.id(3).path('file1').position(20).bodyHTML('shhhh').state('PENDING'),
        );
      }).addReviewThread(t => {
        t.thread(t0 => t0.isResolved(true));
        t.addComment();
        return t;
      })
      .build();

    let wrapper, openIssueish;

    beforeEach(function() {
      openIssueish = sinon.spy();

      wrapper = shallow(buildApp({openIssueish}))
        .find(AggregatedReviewsContainer)
        .renderProp('children')({errors, summaries, commentThreads});
    });

    it('renders threads with comments', function() {
      const threads = wrapper.find('details.github-Review');
      assert.lengthOf(threads, 3);
      assert.lengthOf(threads.at(0).find('.github-Review-comment'), 2);
      assert.lengthOf(threads.at(1).find('.github-Review-comment'), 2);
      assert.lengthOf(threads.at(2).find('.github-Review-comment'), 1);
    });

    it('hides minimized comment content', function() {
      const thread = wrapper.find('details.github-Review').at(0);
      const comment = thread.find('.github-Review-comment--hidden');
      assert.strictEqual(comment.find('em').text(), 'This comment was hidden');
    });

    describe('each thread', function() {
      it('displays correct data', function() {
        const thread = wrapper.find('details.github-Review').at(0);
        assert.strictEqual(thread.find('.github-Review-path').text(), 'dir');
        assert.strictEqual(thread.find('.github-Review-file').text(), '/file0');
        // TODO: FIX ME
        assert.strictEqual(thread.find('.github-Review-lineNr').text(), '10');
      });

      it('displays a pending badge when the comment is part of a pending review', function() {
        const thread = wrapper.find('details.github-Review').at(1);

        const comment0 = thread.find('.github-Review-comment').at(0);
        assert.isFalse(comment0.hasClass('github-Review-comment--pending'));
        assert.isFalse(comment0.exists('.github-Review-pendingBadge'));

        const comment1 = thread.find('.github-Review-comment').at(1);
        assert.isTrue(comment1.hasClass('github-Review-comment--pending'));
        assert.isTrue(comment1.exists('.github-Review-pendingBadge'));
      });

      it('omits the / when there is no directory', function() {
        const thread = wrapper.find('details.github-Review').at(1);
        assert.isFalse(thread.exists('.github-Review-path'));
        assert.strictEqual(thread.find('.github-Review-file').text(), 'file1');
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
            thread.find('.github-Review-navButton.icon-code').length === 1 &&
            thread.find('.github-Review-navButton.icon-diff').length === 1,
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
            wrapper.find('details.github-Review').at(0).find('.icon-code').simulate('click', {
              currentTarget: {dataset: {path: 'dir/file0', line: 10}},
            });
            assert.isTrue(openFile.calledWith('dir/file0', 10));
          });
        });

        describe('when PR is not checked out', function() {
          const openFile = sinon.spy();
          const openDiff = sinon.spy();

          beforeEach(function() {
            const checkoutOp = new EnableableOperation(() => {});
            wrapper = shallow(buildApp({openFile, openDiff, checkoutOp}))
              .find(AggregatedReviewsContainer)
              .renderProp('children')({errors, summaries, commentThreads});
          });

          it('"Jump To File" button is disabled', function() {
            assert.isTrue(wrapper.find('button.icon-code').everyWhere(button => button.prop('disabled') === true));
          });

          it('does not calls openFile when when "Jump To File" is clicked', function() {
            wrapper.find('details.github-Review').at(0).find('.icon-code').simulate('click', {currentTarget: {dataset: {path: 'dir/file0', line: 10}}});
            assert.isFalse(openFile.called);
          });

          it('"Open Diff" still works', function() {
            wrapper.find('details.github-Review').at(0).find('.icon-diff').simulate('click', {currentTarget: {dataset: {path: 'dir/file0', line: 10}}});
            assert(openDiff.calledWith('dir/file0', 10));
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

    it('handles issueish link clicks on comment bodies', function() {
      const comment = wrapper.find('.github-Review-comment').at(2);

      comment.find('GithubDotcomMarkdown').prop('switchToIssueish')('aaa', 'bbb', 100);
      assert.isTrue(openIssueish.calledWith('aaa', 'bbb', 100));

      comment.find('GithubDotcomMarkdown').prop('openIssueishLinkInNewTab')({
        target: {dataset: {url: 'https://github.com/ccc/ddd/pulls/1'}},
      });
      assert.isTrue(openIssueish.calledWith('ccc', 'ddd', 1));
    });

    it('renders progress bar', function() {
      assert.isTrue(wrapper.find('.github-Reviews-progress').exists());
      assert.strictEqual(wrapper.find('.github-Reviews-count').text(), 'Resolved 1 of 3');
      assert.include(wrapper.find('progress.github-Reviews-progessBar').props(), {value: 1, max: 3});
    });
  });
});
