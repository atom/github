import Remote from '../../lib/models/remote';

describe('Remote', function() {
  it('detects and extracts information from GitHub repository URLs', function() {
    const urls = [
      'git@github.com:atom/github.git',
      'https://github.com/atom/github.git',
      'https://git:pass@github.com/atom/github.git',
      'ssh+https://github.com/atom/github.git',
      'git://github.com/atom/github',
      'ssh://git@github.com:atom/github.git',
    ];

    for (const url of urls) {
      const remote = new Remote('origin', url);

      assert.equal(remote.getName(), 'origin');
      assert.equal(remote.getUrl(), url);
      assert.isTrue(remote.isGithubRepo());
      assert.equal(remote.getOwner(), 'atom');
      assert.equal(remote.getRepo(), 'github');
    }
  });

  it('detects non-GitHub remotes', function() {
    const urls = [
      'git@gitlab.com:atom/github.git',
      'atom/github',
    ];

    for (const url of urls) {
      const remote = new Remote('origin', url);

      assert.equal(remote.getName(), 'origin');
      assert.equal(remote.getUrl(), url);
      assert.isFalse(remote.isGithubRepo());
      assert.isNull(remote.getOwner());
      assert.isNull(remote.getRepo());
    }
  });
});
