import React from 'react';
import {shallow, mount} from 'enzyme';

import RecentCommitsView from '../../lib/views/recent-commits-view';
import Commit from '../../lib/models/commit';

describe.only('RecentCommitsView', function() {
  let app;

  beforeEach(function() {
    app = <RecentCommitsView commits={[]} isLoading={false} />;
  });

  it('shows a placeholder while commits are empty and loading', function() {
    app = React.cloneElement(app, {commits: [], isLoading: true});
    const wrapper = shallow(app);

    assert.isFalse(wrapper.find('RecentCommitView').exists());
    assert.strictEqual(wrapper.find('.github-RecentCommit-message').text(), 'Recent commits');
  });

  it('shows a prompting message while commits are empty and not loading', function() {
    app = React.cloneElement(app, {commits: [], isLoading: false});
    const wrapper = shallow(app);

    assert.isFalse(wrapper.find('RecentCommitView').exists());
    assert.strictEqual(wrapper.find('.github-RecentCommit-message').text(), 'Make your first commit');
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

  it.only('renders an avatar corresponding to the GitHub user who authored the commit', function() {
    const commits = ['one@x.com', 'two@y.com', 'thr&ee@z.com'].map(authorEmail => {
      return new Commit({sha: '1111111111', authorEmail, authorDate: 0, message: 'x'});
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
});
