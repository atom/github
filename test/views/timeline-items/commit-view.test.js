/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import {shallow} from 'enzyme';

import {BareCommitView} from '../../../lib/views/timeline-items/commit-view';

describe('CommitView', function() {
  it('prefers displaying usernames from `user.login`', function() {
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'committer_name', avatarUrl: '',
        user: {
          login: 'committer_login',
        },
      },
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title="author_login" />),
    );
    assert.isTrue(
      instance.containsMatchingElement(<img title="committer_login" />),
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title="author_name" />),
    );
    assert.isTrue(
      instance.containsMatchingElement(<img title="committer_name" />),
    );
  });

  it('ignores committer when it authored by the same person', function() {
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: true,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title="author_login" />),
    );
    assert.isFalse(
      instance.containsMatchingElement(<img title="committer_name" />),
    );
  });

  it('ignores the committer when it is authored by GitHub', function() {
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title="author_login" />),
    );
    assert.isFalse(
      instance.containsMatchingElement(<img title="GitHub" />),
    );
  });

  it('ignores the committer when it uses the GitHub no-reply address', function() {
    const item = {
      author: {
        name: 'author_name', avatarUrl: '',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'Someone', email: 'noreply@github.com', avatarUrl: '',
        user: null,
      },
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img title="author_login" />),
    );
    assert.isFalse(
      instance.containsMatchingElement(<img title="GitHub" />),
    );
  });

  it('renders avatar URLs', function() {
    const item = {
      author: {
        name: 'author_name', avatarUrl: 'URL1',
        user: {
          login: 'author_login',
        },
      },
      committer: {
        name: 'GitHub', avatarUrl: 'URL2',
        user: {
          login: 'committer_login',
        },
      },
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: false,
      message: 'commit message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<img src="URL1" />),
    );
    assert.isTrue(
      instance.containsMatchingElement(<img src="URL2" />),
    );
  });

  it('shows the full commit message as tooltip', function() {
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: true,
      message: 'full message',
      messageHeadlineHTML: '<h1>html</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.isTrue(
      instance.containsMatchingElement(<span title="full message" />),
    );
  });

  it('renders commit message headline', function() {
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: true,
      message: 'full message',
      messageHeadlineHTML: '<h1>inner HTML</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.match(instance.html(), /<h1>inner HTML<\/h1>/);
  });

  it('renders commit sha', function() {
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
      oid: 'e6c80aa37dc6f7a5e5491e0ed6e00ec2c812b1a5',
      authoredByCommitter: true,
      message: 'full message',
      messageHeadlineHTML: '<h1>inner HTML</h1>',
    };
    const app = <BareCommitView item={item} />;
    const instance = shallow(app);
    assert.match(instance.text(), /e6c80aa3/);
  });
});
