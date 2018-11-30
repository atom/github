import React from 'react';
import {shallow, mount} from 'enzyme';

import RecentCommitsView from '../../lib/views/recent-commits-view';
import {commitBuilder} from '../builder/commit';

describe('RecentCommitsView', function() {
  let atomEnv, app;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    app = (
      <RecentCommitsView
        commits={[]}
        isLoading={false}
        selectedCommitSha=""
        commandRegistry={atomEnv.commands}
        undoLastCommit={() => { }}
        openCommit={() => { }}
        selectNextCommit={() => { }}
        selectPreviousCommit={() => { }}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('shows a placeholder while commits are empty and loading', function() {
    app = React.cloneElement(app, {commits: [], isLoading: true});
    const wrapper = shallow(app);

    assert.isFalse(wrapper.find('RecentCommitView').exists());
    assert.strictEqual(wrapper.find('.github-RecentCommits-message').text(), 'Recent commits');
  });

  it('shows a prompting message while commits are empty and not loading', function() {
    app = React.cloneElement(app, {commits: [], isLoading: false});
    const wrapper = shallow(app);

    assert.isFalse(wrapper.find('RecentCommitView').exists());
    assert.strictEqual(wrapper.find('.github-RecentCommits-message').text(), 'Make your first commit');
  });

  it('renders a RecentCommitView for each commit', function() {
    const commits = ['1', '2', '3'].map(sha => commitBuilder().sha(sha).build());

    app = React.cloneElement(app, {commits});
    const wrapper = shallow(app);

    assert.deepEqual(wrapper.find('RecentCommitView').map(w => w.prop('commit')), commits);
  });

  it('renders emojis in the commit subject', function() {
    const commits = [commitBuilder().messageSubject(':heart: :shirt: :smile:').build()];

    app = React.cloneElement(app, {commits});
    const wrapper = mount(app);
    assert.strictEqual(wrapper.find('.github-RecentCommit-message').text(), '❤️ 👕 😄');
  });

  it('renders an avatar corresponding to the GitHub user who authored the commit', function() {
    const commits = ['thr&ee@z.com', 'two@y.com', 'one@x.com'].map((authorEmail, i) => {
      return commitBuilder()
        .sha(`1111111111${i}`)
        .authorEmail(authorEmail)
        .build();
    });

    app = React.cloneElement(app, {commits});
    const wrapper = mount(app);
    assert.deepEqual(
      wrapper.find('img.github-RecentCommit-avatar').map(w => w.prop('src')),
      [
        'https://avatars.githubusercontent.com/u/e?email=thr%26ee%40z.com&s=32',
        'https://avatars.githubusercontent.com/u/e?email=two%40y.com&s=32',
        'https://avatars.githubusercontent.com/u/e?email=one%40x.com&s=32',
      ],
    );
  });

  it('renders multiple avatars for co-authored commits', function() {
    const commits = [
      commitBuilder()
        .authorEmail('thr&ee@z.com')
        .addCoAuthor('One', 'two@y.com')
        .addCoAuthor('Two', 'one@x.com')
        .build(),
    ];

    app = React.cloneElement(app, {commits});
    const wrapper = mount(app);
    assert.deepEqual(
      wrapper.find('img.github-RecentCommit-avatar').map(w => w.prop('src')),
      [
        'https://avatars.githubusercontent.com/u/e?email=thr%26ee%40z.com&s=32',
        'https://avatars.githubusercontent.com/u/e?email=two%40y.com&s=32',
        'https://avatars.githubusercontent.com/u/e?email=one%40x.com&s=32',
      ],
    );
  });

  it("renders the commit's relative age", function() {
    const commit = commitBuilder().authorDate(1519848555).build();

    app = React.cloneElement(app, {commits: [commit]});
    const wrapper = mount(app);
    assert.isTrue(wrapper.find('Timeago').prop('time').isSame(1519848555000));
  });

  it('renders emoji in the title attribute', function() {
    const commit = commitBuilder().messageSubject(':heart:').messageBody('and a commit body').build();

    app = React.cloneElement(app, {commits: [commit]});
    const wrapper = mount(app);

    assert.strictEqual(
      wrapper.find('.github-RecentCommit-message').prop('title'),
      '❤️\n\nand a commit body',
    );
  });

  it('renders the full commit message in a title attribute', function() {
    const commit = commitBuilder()
      .messageSubject('really really really really really really really long')
      .messageBody('and a commit body')
      .build();

    app = React.cloneElement(app, {commits: [commit]});
    const wrapper = mount(app);

    assert.strictEqual(
      wrapper.find('.github-RecentCommit-message').prop('title'),
      'really really really really really really really long\n\n' +
      'and a commit body',
    );
  });
});
