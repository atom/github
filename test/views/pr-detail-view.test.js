import React from 'react';
import {shallow} from 'enzyme';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';

import {BarePullRequestDetailView, checkoutStates} from '../../lib/views/pr-detail-view';
import EmojiReactionsView from '../../lib/views/emoji-reactions-view';
import {pullRequestDetailViewProps} from '../fixtures/props/issueish-pane-props';
import EnableableOperation from '../../lib/models/enableable-operation';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('PullRequestDetailView', function() {
  function buildApp(opts, overrideProps = {}) {
    return <BarePullRequestDetailView {...pullRequestDetailViewProps(opts, overrideProps)} />;
  }

  it('renders pull request information', function() {
    const baseRefName = 'master';
    const headRefName = 'tt/heck-yes';
    const wrapper = shallow(buildApp({
      repositoryName: 'repo',
      ownerLogin: 'user0',

      pullRequestKind: 'PullRequest',
      pullRequestTitle: 'PR title',
      pullRequestBaseRef: baseRefName,
      pullRequestHeadRef: headRefName,
      pullRequestBodyHTML: '<code>stuff</code>',
      pullRequestAuthorLogin: 'author0',
      pullRequestAuthorAvatarURL: 'https://avatars3.githubusercontent.com/u/1',
      issueishNumber: 100,
      pullRequestState: 'MERGED',
      pullRequestReactions: [{content: 'THUMBS_UP', count: 10}, {content: 'THUMBS_DOWN', count: 5}, {content: 'LAUGH', count: 0}],
    }));

    const badge = wrapper.find('IssueishBadge');
    assert.strictEqual(badge.prop('type'), 'PullRequest');
    assert.strictEqual(badge.prop('state'), 'MERGED');

    const link = wrapper.find('a.github-IssueishDetailView-headerLink');
    assert.strictEqual(link.text(), 'user0/repo#100');
    assert.strictEqual(link.prop('href'), 'https://github.com/user0/repo/pull/100');

    assert.isTrue(wrapper.find('.github-IssueishDetailView-checkoutButton').exists());

    assert.isDefined(wrapper.find('ForwardRef(Relay(BarePrStatusesView))[displayType="check"]').prop('pullRequest'));

    const avatarLink = wrapper.find('.github-IssueishDetailView-avatar');
    assert.strictEqual(avatarLink.prop('href'), 'https://github.com/author0');
    const avatar = avatarLink.find('img');
    assert.strictEqual(avatar.prop('src'), 'https://avatars3.githubusercontent.com/u/1');
    assert.strictEqual(avatar.prop('title'), 'author0');

    assert.strictEqual(wrapper.find('.github-IssueishDetailView-title').text(), 'PR title');

    assert.isTrue(wrapper.find('GithubDotcomMarkdown').someWhere(n => n.prop('html') === '<code>stuff</code>'));

    assert.lengthOf(wrapper.find(EmojiReactionsView), 1);

    assert.notOk(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('issue'));
    assert.isNotNull(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('pullRequest'));
    assert.isNotNull(wrapper.find('ForwardRef(Relay(BarePrStatusesView))[displayType="full"]').prop('pullRequest'));

    assert.strictEqual(wrapper.find('.github-IssueishDetailView-baseRefName').text(), baseRefName);
    assert.strictEqual(wrapper.find('.github-IssueishDetailView-headRefName').text(), headRefName);
  });

  it('renders tabs', function() {
    const pullRequestCommitCount = 11;
    const pullRequestChangedFileCount = 22;
    const wrapper = shallow(buildApp({pullRequestCommitCount, pullRequestChangedFileCount}));

    assert.lengthOf(wrapper.find(Tabs), 1);
    assert.lengthOf(wrapper.find(TabList), 1);

    const tabs = wrapper.find(Tab).getElements();
    assert.lengthOf(tabs, 4);

    const tab0Children = tabs[0].props.children;
    assert.deepEqual(tab0Children[0].props, {icon: 'info', className: 'github-IssueishDetailView-tab-icon'});
    assert.deepEqual(tab0Children[1], 'Overview');

    const tab1Children = tabs[1].props.children;
    assert.deepEqual(tab1Children[0].props, {icon: 'checklist', className: 'github-IssueishDetailView-tab-icon'});
    assert.deepEqual(tab1Children[1], 'Build Status');

    const tab2Children = tabs[2].props.children;
    assert.deepEqual(tab2Children[0].props, {icon: 'git-commit', className: 'github-IssueishDetailView-tab-icon'});
    assert.deepEqual(tab2Children[1], 'Commits');

    const tab3Children = tabs[3].props.children;
    assert.deepEqual(tab3Children[0].props, {icon: 'diff', className: 'github-IssueishDetailView-tab-icon'});
    assert.deepEqual(tab3Children[1], 'Files');

    const tabCounts = wrapper.find('.github-IssueishDetailView-tab-count');
    assert.lengthOf(tabCounts, 2);
    assert.strictEqual(tabCounts.at(0).text(), `${pullRequestCommitCount}`);
    assert.strictEqual(tabCounts.at(1).text(), `${pullRequestChangedFileCount}`);

    assert.lengthOf(wrapper.find(TabPanel), 4);
  });

  it('tells its tabs when the pull request is currently checked out', function() {
    const wrapper = shallow(buildApp({}, {
      checkoutOp: new EnableableOperation(() => {}).disable(checkoutStates.CURRENT),
    }));

    assert.isTrue(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isTrue(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isTrue(wrapper.find('ForwardRef(Relay(PrCommitsView))').prop('onBranch'));
  });

  it('tells its tabs when the pull request is not checked out', function() {
    const checkoutOp = new EnableableOperation(() => {});

    const wrapper = shallow(buildApp({}, {checkoutOp}));
    assert.isFalse(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isFalse(wrapper.find('ForwardRef(Relay(PrCommitsView))').prop('onBranch'));

    wrapper.setProps({checkoutOp: checkoutOp.disable(checkoutStates.HIDDEN, 'message')});
    assert.isFalse(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isFalse(wrapper.find('ForwardRef(Relay(PrCommitsView))').prop('onBranch'));

    wrapper.setProps({checkoutOp: checkoutOp.disable(checkoutStates.DISABLED, 'message')});
    assert.isFalse(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isFalse(wrapper.find('ForwardRef(Relay(PrCommitsView))').prop('onBranch'));

    wrapper.setProps({checkoutOp: checkoutOp.disable(checkoutStates.BUSY, 'message')});
    assert.isFalse(wrapper.find('ForwardRef(Relay(IssueishTimelineView))').prop('onBranch'));
    assert.isFalse(wrapper.find('ForwardRef(Relay(PrCommitsView))').prop('onBranch'));
  });

  it('renders pull request information for cross repository PR', function() {
    const baseRefName = 'master';
    const headRefName = 'tt-heck-yes';
    const ownerLogin = 'user0';
    const authorLogin = 'author0';
    const wrapper = shallow(buildApp({
      ownerLogin,
      pullRequestBaseRef: baseRefName,
      pullRequestHeadRef: headRefName,
      pullRequestAuthorLogin: authorLogin,
      pullRequestCrossRepository: true,
    }));

    assert.strictEqual(wrapper.find('.github-IssueishDetailView-baseRefName').text(), `${ownerLogin}/${baseRefName}`);
    assert.strictEqual(wrapper.find('.github-IssueishDetailView-headRefName').text(), `${authorLogin}/${headRefName}`);
  });

  it('renders a placeholder issueish body', function() {
    const wrapper = shallow(buildApp({pullRequestBodyHTML: null}));
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

  it('disregards a double refresh', function() {
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

  describe('Checkout button', function() {
    it('triggers its operation callback on click', function() {
      const cb = sinon.spy();
      const checkoutOp = new EnableableOperation(cb);
      const wrapper = shallow(buildApp({}, {checkoutOp}));

      const button = wrapper.find('.github-IssueishDetailView-checkoutButton');
      assert.strictEqual(button.text(), 'Checkout');
      button.simulate('click');
      assert.isTrue(cb.called);
    });

    it('renders as disabled with hover text set to the disablement message', function() {
      const checkoutOp = new EnableableOperation(() => {}).disable(checkoutStates.DISABLED, 'message');
      const wrapper = shallow(buildApp({}, {checkoutOp}));

      const button = wrapper.find('.github-IssueishDetailView-checkoutButton');
      assert.isTrue(button.prop('disabled'));
      assert.strictEqual(button.text(), 'Checkout');
      assert.strictEqual(button.prop('title'), 'message');
    });

    it('changes the button text when disabled because the PR is the current branch', function() {
      const checkoutOp = new EnableableOperation(() => {}).disable(checkoutStates.CURRENT, 'message');
      const wrapper = shallow(buildApp({}, {checkoutOp}));

      const button = wrapper.find('.github-IssueishDetailView-checkoutButton');
      assert.isTrue(button.prop('disabled'));
      assert.strictEqual(button.text(), 'Checked out');
      assert.strictEqual(button.prop('title'), 'message');
    });

    it('renders hidden', function() {
      const checkoutOp = new EnableableOperation(() => {}).disable(checkoutStates.HIDDEN, 'message');
      const wrapper = shallow(buildApp({}, {checkoutOp}));

      assert.isFalse(wrapper.find('.github-IssueishDetailView-checkoutButton').exists());
    });
  });

  describe('metrics', function() {
    beforeEach(function() {
      sinon.stub(reporterProxy, 'addEvent');
    });

    it('records clicking the link to view an issueish', function() {
      const wrapper = shallow(buildApp({
        repositoryName: 'repo',
        ownerLogin: 'user0',
        issueishNumber: 100,
      }));

      const link = wrapper.find('a.github-IssueishDetailView-headerLink');
      assert.strictEqual(link.text(), 'user0/repo#100');
      assert.strictEqual(link.prop('href'), 'https://github.com/user0/repo/pull/100');
      link.simulate('click');

      assert.isTrue(reporterProxy.addEvent.calledWith('open-pull-request-in-browser', {package: 'github', component: 'BarePullRequestDetailView'}));
    });

    function findTabIndex(wrapper, tabText) {
      let finalIndex;
      let tempIndex = 0;
      wrapper.find('Tab').forEach(t => {
        t.children().forEach(child => {
          if (child.text() === tabText) {
            finalIndex = tempIndex;
          }
        });
        tempIndex++;
      });
      return finalIndex;
    }

    it('records opening the Overview tab', function() {
      const wrapper = shallow(buildApp());
      const index = findTabIndex(wrapper, 'Overview');

      wrapper.find('Tabs').prop('onSelect')(index);

      assert.isTrue(reporterProxy.addEvent.calledWith('open-pr-tab-overview', {package: 'github', component: 'BarePullRequestDetailView'}));
    });

    it('records opening the Build Status tab', function() {
      const wrapper = shallow(buildApp());
      const index = findTabIndex(wrapper, 'Build Status');

      wrapper.find('Tabs').prop('onSelect')(index);

      assert.isTrue(reporterProxy.addEvent.calledWith('open-pr-tab-build-status', {package: 'github', component: 'BarePullRequestDetailView'}));
    });

    it('records opening the Commits tab', function() {
      const wrapper = shallow(buildApp());
      const index = findTabIndex(wrapper, 'Commits');

      wrapper.find('Tabs').prop('onSelect')(index);

      assert.isTrue(reporterProxy.addEvent.calledWith('open-pr-tab-commits', {package: 'github', component: 'BarePullRequestDetailView'}));
    });

    it('records opening the "Files Changed" tab', function() {
      const wrapper = shallow(buildApp());
      const index = findTabIndex(wrapper, 'Files');

      wrapper.find('Tabs').prop('onSelect')(index);

      assert.isTrue(reporterProxy.addEvent.calledWith('open-pr-tab-files-changed', {package: 'github', component: 'BarePullRequestDetailView'}));
    });
  });
});
