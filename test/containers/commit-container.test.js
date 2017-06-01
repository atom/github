import React from 'react';
import {shallow} from 'enzyme';

import {Commit} from '../../lib/containers/timeline-items/commit-container';

describe('CommitContainer', function() {
  it('prefers displaying usernames from `user.login`', function() {
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login'
        }
      },
      committer: {
        name: 'committer_name', avatarUrl: '',
        user: {
          login: 'committer_login'
        }
      },
      oid: 'ff22',
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title='author_login' />)
    );
    assert.isTrue(
      instance.containsMatchingElement(<img title='committer_login' />)
    );
  });

  it('displays the names if the are no usernames ', function() {
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: null,
      },
      committer: {
        name: 'committer_name', avatarUrl: '',
        user: null,
      },
      oid: 'ff22',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title='author_name' />)
    );
    assert.isTrue(
      instance.containsMatchingElement(<img title='committer_name' />)
    );
  });

  it('ignores committer when it authored by the same person', function(){
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'author_name', avatarUrl: '',
        user: null,
      },
      oid: 'ff22',
      authoredByCommitter: true,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title='author_login' />)
    );
    assert.isFalse(
      instance.containsMatchingElement(<img title='committer_name' />)
    );
  });

  it('ignores committer when it authored by GitHub', function(){
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'GitHub', avatarUrl: '',
        user: null,
      },
      oid: 'ff22',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title='author_login' />)
    );
    assert.isFalse(
      instance.containsMatchingElement(<img title='GitHub' />)
    );
  });

  it('shows the full commit message as tooltip', function(){
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'author_name', avatarUrl: '',
        user: null,
      },
      oid: 'ff22',
      authoredByCommitter: true,
      message: 'full message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<span title='full message' />)
    );
  });

  it('renders commit message headline', function(){
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'author_name', avatarUrl: '',
        user: null,
      },
      oid: 'ff22',
      authoredByCommitter: true,
      message: 'full message',
      messageHeadlineHTML: '<h1>inner HTML</h1>',
    };
    const app = <Commit item={item} />;
    const instance = shallow(app);
    assert.match(instance.html(), /<h1>inner HTML<\/h1>/);
  });

});
