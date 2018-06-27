import React from 'react';
import {shallow} from 'enzyme';

import {BareIssueishDetailView} from '../../lib/views/issueish-detail-view';
import {issueishDetailViewProps} from '../fixtures/props/issueish-pane-props';

describe('IssueishDetailView', function() {
  function buildApp(opts, overrideProps = {}) {
    return <BareIssueishDetailView {...issueishDetailViewProps(opts, overrideProps)} />;
  }

  it('renders pull request information', function() {
    const wrapper = shallow(buildApp({
      repositoryName: 'repo',
      ownerLogin: 'user0',

      issueishKind: 'PullRequest',
      issueishTitle: 'PR title',
      issueishBodyHTML: '<code>stuff</code>',
      issueishAuthorLogin: 'author0',
      issueishAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/1',
      issueishNumber: 100,
      issueishState: 'MERGED',
      issueishReactions: [{content: 'THUMBS_UP', count: 10}, {content: 'THUMBS_DOWN', count: 5}, {content: 'LAUGH', count: 0}],
    }));

    const badge = wrapper.find('IssueishBadge');
    assert.strictEqual(badge.prop('type'), 'PullRequest');
    assert.strictEqual(badge.prop('state'), 'MERGED');

    const link = wrapper.find('a.github-IssueishDetailView-headerLink');
    assert.strictEqual(link.text(), 'user0/repo#100');
    assert.strictEqual(link.prop('href'), 'https://github.com/user0/repo/pull/100');

    assert.isDefined(wrapper.find('Relay(PrStatuses)[displayType="check"]').prop('pullRequest'));

    const avatarLink = wrapper.find('.github-IssueishDetailView-avatar');
    assert.strictEqual(avatarLink.prop('href'), 'https://github.com/author0');
    const avatar = avatarLink.find('img');
    assert.strictEqual(avatar.prop('src'), 'https://avatars3.githubusercontent.com/u/1');
    assert.strictEqual(avatar.prop('title'), 'author0');

    assert.strictEqual(wrapper.find('.github-IssueishDetailView-title').text(), 'PR title');

    assert.isTrue(wrapper.find('GithubDotcomMarkdown').someWhere(n => n.prop('html') === '<code>stuff</code>'));

    const reactionGroups = wrapper.find('.github-IssueishDetailView-reactionsGroup');
    assert.lengthOf(reactionGroups.findWhere(n => /👍/u.test(n.text()) && /\b10\b/.test(n.text())), 1);
    assert.lengthOf(reactionGroups.findWhere(n => /👎/u.test(n.text()) && /\b5\b/.test(n.text())), 1);
    assert.isFalse(reactionGroups.someWhere(n => /😆/u.test(n.text())));

    assert.isNull(wrapper.find('Relay(IssueishTimelineView)').prop('issue'));
    assert.isNotNull(wrapper.find('Relay(IssueishTimelineView)').prop('pullRequest'));
    assert.isNotNull(wrapper.find('Relay(PrStatuses)[displayType="full"]').prop('pullRequest'));
  });

  it('renders issue information', function() {
    const wrapper = shallow(buildApp({
      repositoryName: 'repo',
      ownerLogin: 'user1',

      issueishKind: 'Issue',
      issueishTitle: 'Issue title',
      issueishBodyHTML: '<code>nope</code>',
      issueishAuthorLogin: 'author1',
      issueishAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/2',
      issueishNumber: 200,
      issueishState: 'CLOSED',
      issueishReactions: [{content: 'THUMBS_UP', count: 6}, {content: 'THUMBS_DOWN', count: 0}, {content: 'LAUGH', count: 2}],
    }));

    const badge = wrapper.find('IssueishBadge');
    assert.strictEqual(badge.prop('type'), 'Issue');
    assert.strictEqual(badge.prop('state'), 'CLOSED');

    const link = wrapper.find('a.github-IssueishDetailView-headerLink');
    assert.strictEqual(link.text(), 'user1/repo#200');
    assert.strictEqual(link.prop('href'), 'https://github.com/user1/repo/issues/200');

    assert.isFalse(wrapper.find('Relay(PrStatuses)').exists());

    const avatarLink = wrapper.find('.github-IssueishDetailView-avatar');
    assert.strictEqual(avatarLink.prop('href'), 'https://github.com/author1');
    const avatar = avatarLink.find('img');
    assert.strictEqual(avatar.prop('src'), 'https://avatars3.githubusercontent.com/u/2');
    assert.strictEqual(avatar.prop('title'), 'author1');

    assert.strictEqual(wrapper.find('.github-IssueishDetailView-title').text(), 'Issue title');

    assert.isTrue(wrapper.find('GithubDotcomMarkdown').someWhere(n => n.prop('html') === '<code>nope</code>'));

    const reactionGroups = wrapper.find('.github-IssueishDetailView-reactionsGroup');
    assert.lengthOf(reactionGroups.findWhere(n => /👍/u.test(n.text()) && /\b6\b/.test(n.text())), 1);
    assert.isFalse(reactionGroups.someWhere(n => /👎/u.test(n.text())));
    assert.lengthOf(reactionGroups.findWhere(n => /😆/u.test(n.text()) && /\b2\b/.test(n.text())), 1);

    assert.isNotNull(wrapper.find('Relay(IssueishTimelineView)').prop('issue'));
    assert.isNull(wrapper.find('Relay(IssueishTimelineView)').prop('pullRequest'));
  });

  it('renders a placeholder issueish body', function() {
    const wrapper = shallow(buildApp({issueishBodyHTML: null}));
    assert.isTrue(wrapper.find('GithubDotcomMarkdown').someWhere(n => /No description/.test(n.prop('html'))));
  });

  it('refreshes on click', function() {
    let callback = null;
    const relayRefetch = sinon.stub().callsFake((_0, _1, cb) => {
      callback = cb;
    });
    const wrapper = shallow(buildApp({relayRefetch}, {}));

    wrapper.find('Octicon[icon="repo-sync"]').simulate('click', {preventDefault: () => {}});
    assert.isTrue(wrapper.find('Octicon[icon="repo-sync"]').hasClass('refreshing'));

    callback();
    wrapper.update();

    assert.isFalse(wrapper.find('Octicon[icon="repo-sync"]').hasClass('refreshing'));
  });

  it('disregardes a double refresh', function() {
    let callback = null;
    const relayRefetch = sinon.stub().callsFake((_0, _1, cb) => {
      callback = cb;
    });
    const wrapper = shallow(buildApp({relayRefetch}, {}));

    wrapper.find('Octicon[icon="repo-sync"]').simulate('click', {preventDefault: () => {}});
    assert.strictEqual(relayRefetch.callCount, 1);

    wrapper.find('Octicon[icon="repo-sync"]').simulate('click', {preventDefault: () => {}});
    assert.strictEqual(relayRefetch.callCount, 1);

    callback();
    wrapper.update();

    wrapper.find('Octicon[icon="repo-sync"]').simulate('click', {preventDefault: () => {}});
    assert.strictEqual(relayRefetch.callCount, 2);
  });

  it('configures the refresher with a 5 minute polling interval', function() {
    const wrapper = shallow(buildApp({}));

    assert.strictEqual(wrapper.instance().refresher.options.interval(), 5 * 60 * 1000);
  });

  it('destroys its refresher on unmount', function() {
    const wrapper = shallow(buildApp({}));

    const refresher = wrapper.instance().refresher;
    sinon.spy(refresher, 'destroy');

    wrapper.unmount();

    assert.isTrue(refresher.destroy.called);
  });
});
