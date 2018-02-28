import React from 'react';
import {shallow, mount} from 'enzyme';
import moment from 'moment';

import RecentCommitsView from '../../lib/views/recent-commits-view';
import Commit from '../../lib/models/commit';

describe('RecentCommitsView', function() {
  let app;

  beforeEach(function() {
    app = <RecentCommitsView commits={[]} isLoading={false} />;
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
    const commits = ['1', '2', '3'].map(sha => {
      return {
        getSha() { return sha; },
      };
    });

    app = React.cloneElement(app, {commits});
    const wrapper = shallow(app);

    assert.deepEqual(wrapper.find('RecentCommitView').map(w => w.prop('commit')), commits);
  });

  it('renders an avatar corresponding to the GitHub user who authored the commit', function() {
    const commits = ['thr&ee@z.com', 'two@y.com', 'one@x.com'].map((authorEmail, i) => {
      return new Commit({sha: '1111111111' + i, authorEmail, authorDate: 0, message: 'x'});
    });

    app = React.cloneElement(app, {commits});
    const wrapper = mount(app);
    assert.deepEqual(
      wrapper.find('img.github-RecentCommit-avatar').map(w => w.prop('src')),
      [
        'https://avatars.githubusercontent.com/u/e?email=thr%26ee%40z.com',
        'https://avatars.githubusercontent.com/u/e?email=two%40y.com',
        'https://avatars.githubusercontent.com/u/e?email=one%40x.com',
      ],
    );
  });

  it("renders the commit's relative age", function() {
    const commit = new Commit({
      sha: '1111111111',
      authorEmail: 'me@hooray.party',
      authorDate: 1519848555,
      message: 'x',
    });

    app = React.cloneElement(app, {commits: [commit]});
    const wrapper = mount(app);
    assert.isTrue(wrapper.find('Timeago').prop('time').isSame(1519848555000));
  });
});
