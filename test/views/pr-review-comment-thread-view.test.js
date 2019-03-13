import React from 'react';
import {shallow} from 'enzyme';

import {multiFilePatchBuilder} from '../builder/patch';
import {aggregatedReviewsBuilder} from '../builder/graphql/aggregated-reviews-builder';
import PullRequestReviewCommentThreadView, {PullRequestCommentView} from '../../lib/views/pr-review-comment-thread-view';

describe('PullRequestReviewCommentThreadView', function() {
  function buildApp(multiFilePatch, comments, overrideProps = {}) {
    return shallow(
      <PullRequestReviewCommentThreadView
        isPatchVisible={() => true}
        getBufferRowForDiffPosition={multiFilePatch.getBufferRowForDiffPosition}
        comments={comments}
        switchToIssueish={() => {}}
        {...overrideProps}
      />,
    );
  }

  it('adjusts the position for comments after hunk headers', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
        fp.addHunk(h => h.oldRow(5).unchanged('0 (1)').added('1 (2)', '2 (3)', '3 (4)').unchanged('4 (5)'));
        fp.addHunk(h => h.oldRow(20).unchanged('5 (7)').deleted('6 (8)', '7 (9)', '8 (10)').unchanged('9 (11)'));
        fp.addHunk(h => {
          h.oldRow(30).unchanged('10 (13)').added('11 (14)', '12 (15)').deleted('13 (16)').unchanged('14 (17)');
        });
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file1.txt'));
        fp.addHunk(h => h.oldRow(5).unchanged('15 (1)').added('16 (2)').unchanged('17 (3)'));
        fp.addHunk(h => h.oldRow(20).unchanged('18 (5)').deleted('19 (6)', '20 (7)', '21 (8)').unchanged('22 (9)'));
      })
      .build();

    const {commentThreads} = aggregatedReviewsBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(0).path('file0.txt').position(2).bodyHTML('one'));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(1).path('file0.txt').position(15).bodyHTML('two'));
      })
      .addReviewThread(t => {
        t.addComment(c => c.id(2).path('file1.txt').position(7).bodyHTML('three'));
      })
      .build();

    const wrapper0 = buildApp(multiFilePatch, commentThreads[0].comments);
    assert.deepEqual(wrapper0.find('Marker').prop('bufferRange').serialize(), [[1, 0], [1, 0]]);

    const wrapper1 = buildApp(multiFilePatch, commentThreads[1].comments);
    assert.deepEqual(wrapper1.find('Marker').prop('bufferRange').serialize(), [[12, 0], [12, 0]]);

    const wrapper2 = buildApp(multiFilePatch, commentThreads[2].comments);
    assert.deepEqual(wrapper2.find('Marker').prop('bufferRange').serialize(), [[20, 0], [20, 0]]);
  });

  it('does not render comments if the patch is too large or collapsed', function() {
    const {multiFilePatch} = multiFilePatchBuilder().build();

    const {commentThreads} = aggregatedReviewsBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(0).path('file0.txt').position(2).bodyHTML('one'));
      })
      .build();

    const wrapper = buildApp(multiFilePatch, commentThreads[0].comments, {isPatchVisible: () => false});
    assert.isFalse(wrapper.exists('PullRequestCommentView'));
  });

  it('does not render comment if position is null', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file0.txt'));
        fp.addHunk(h => h.oldRow(5).unchanged('0 (1)').added('1 (2)', '2 (3)', '3 (4)').unchanged('4 (5)'));
        fp.addHunk(h => h.oldRow(20).unchanged('5 (7)').deleted('6 (8)', '7 (9)', '8 (10)').unchanged('9 (11)'));
        fp.addHunk(h => {
          h.oldRow(30).unchanged('10 (13)').added('11 (14)', '12 (15)').deleted('13 (16)').unchanged('14 (17)');
        });
      })
      .build();

    const {commentThreads} = aggregatedReviewsBuilder()
      .addReviewThread(t => {
        t.addComment(c => c.id(1).path('file0.txt').position(null).bodyHTML('three'));
      })
      .build();

    const wrapper = buildApp(multiFilePatch, commentThreads[0].comments);

    assert.isFalse(wrapper.exists('PullRequestCommentView'));
  });
});

describe('PullRequestCommentView', function() {
  const avatarUrl = 'https://avatars3.githubusercontent.com/u/3781742?s=40&v=4';
  const login = 'annthurium';
  const commentUrl = 'https://github.com/kuychaco/test-repo/pull/4#discussion_r244214873';
  const createdAt = '2018-12-27T17:51:17Z';
  const bodyHTML = '<div> yo yo </div>';
  const switchToIssueish = () => {};

  function buildApp(commentOverrideProps = {}, opts = {}) {
    const props = {
      comment: {
        bodyHTML,
        url: commentUrl,
        createdAt,
        author: {
          avatarUrl,
          login,
        },
        ...commentOverrideProps,
      },
      switchToIssueish,
      ...opts,
    };

    return (
      <PullRequestCommentView {...props} />
    );
  }

  it('renders the PullRequestCommentReview information', function() {
    const wrapper = shallow(buildApp());
    const avatar = wrapper.find('.github-PrComment-avatar');

    assert.strictEqual(avatar.getElement('src').props.src, avatarUrl);
    assert.strictEqual(avatar.getElement('alt').props.alt, login);

    assert.include(wrapper.text(), `${login} commented`);

    const a = wrapper.find('.github-PrComment-timeAgo');
    assert.strictEqual(a.getElement('href').props.href, commentUrl);

    const timeAgo = wrapper.find('Timeago');
    assert.strictEqual(timeAgo.prop('time'), createdAt);

    const githubDotcomMarkdown = wrapper.find('GithubDotcomMarkdown');
    assert.strictEqual(githubDotcomMarkdown.prop('html'), bodyHTML);
    assert.strictEqual(githubDotcomMarkdown.prop('switchToIssueish'), switchToIssueish);
  });

  it('contains the text `someone commented` for null authors', function() {
    const wrapper = shallow(buildApp({author: null}));
    assert.include(wrapper.text(), 'someone commented');
  });

  it('hides minimized comment', function() {
    const wrapper = shallow(buildApp({isMinimized: true}));
    assert.isTrue(wrapper.exists('.github-PrComment-hidden'));
    assert.isFalse(wrapper.exists('.github-PrComment-header'));
  });
});
