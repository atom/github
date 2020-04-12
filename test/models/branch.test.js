import moment from 'moment';

import Branch, {nullBranch} from '../../lib/models/branch';

describe('Branch', function() {
  it('creates a branch with no upstream', function() {
    const b = new Branch('refs/heads/feature');
    assert.isTrue(b.getName().isPresent());
    assert.strictEqual(b.getName().full(), 'refs/heads/feature');
    assert.strictEqual(b.getName().short(), 'feature');
    assert.isFalse(b.getUpstream().isPresent());
    assert.isFalse(b.getUpstream().getRefName().isPresent());
    assert.strictEqual(b.getUpstream().getRemoteName(), '');
    assert.isFalse(b.getUpstream().getRemoteRefName().isPresent());
    assert.isFalse(b.getPush().isPresent());
    assert.isFalse(b.getPush().getRefName().isPresent());
    assert.strictEqual(b.getPush().getRemoteName(), '');
    assert.isFalse(b.getPush().getRemoteRefName().isPresent());
    assert.strictEqual(b.getFetchRefSpec(), '');
    assert.strictEqual(b.getPushRefSpec(), '');
    assert.strictEqual(b.getSha(), '');
    assert.isNull(b.getCommitterDate());
    assert.isFalse(b.isHead());
    assert.isFalse(b.isDetached());
    assert.isTrue(b.isPresent());
  });

  it('tracks SHA and committer date when given', function() {
    const b = new Branch('refs/heads/something', {
      sha: '1234',
      committerDate: 'Fri Apr 10 16:54:09 2020 -0400',
    });

    assert.strictEqual(b.getSha(), '1234');
    assert.strictEqual(b.getCommitterDate().toISOString(true), '2020-04-10T16:54:09.000-04:00');
  });

  it('creates a branch tracking an upstream', function() {
    const b = new Branch('refs/heads/feature', {
      upstream: {
        refName: 'refs/remotes/origin/upstream',
        remoteName: 'origin',
        remoteRefName: 'refs/heads/upstream',
      },
    });

    assert.strictEqual(b.getUpstream().getRefName().full(), 'refs/remotes/origin/upstream');
    assert.strictEqual(b.getUpstream().getRefName().short(), 'origin/upstream');
    assert.strictEqual(b.getUpstream().getRemoteName(), 'origin');
    assert.strictEqual(b.getUpstream().getRemoteRefName().full(), 'refs/heads/upstream');
    assert.strictEqual(b.getUpstream().getRemoteRefName().short(), 'upstream');

    assert.strictEqual(b.getPush().getRefName().full(), 'refs/remotes/origin/upstream');
    assert.strictEqual(b.getPush().getRefName().short(), 'origin/upstream');
    assert.strictEqual(b.getPush().getRemoteName(), 'origin');
    assert.strictEqual(b.getPush().getRemoteRefName().full(), 'refs/heads/upstream');
    assert.strictEqual(b.getPush().getRemoteRefName().short(), 'upstream');
  });

  it('creates a branch with separate upstream and push destinations', function() {
    const b = new Branch('feature', {
      upstream: {
        refName: 'refs/remotes/from/source',
        remoteName: 'from',
        remoteRefName: 'refs/heads/source',
      },
      push: {
        refName: 'refs/remotes/to/sink',
        remoteName: 'to',
        remoteRefName: 'refs/heads/sink',
      },
    });

    assert.strictEqual(b.getUpstream().getRefName().full(), 'refs/remotes/from/source');
    assert.strictEqual(b.getUpstream().getRemoteName(), 'from');
    assert.strictEqual(b.getUpstream().getRemoteRefName().full(), 'refs/heads/source');

    assert.strictEqual(b.getPush().getRefName().full(), 'refs/remotes/to/sink');
    assert.strictEqual(b.getPush().getRemoteName(), 'to');
    assert.strictEqual(b.getPush().getRemoteRefName().full(), 'refs/heads/sink');
  });

  it('defaults missing push destination attributes to upstream ones individually', function() {
    const upstream = {
      refName: 'refs/remotes/origin/bN',
      remoteName: 'origin',
      remoteRefName: 'refs/heads/bN',
    };

    const b0 = new Branch('b0', {
      upstream,
      push: {
        refName: '',
        remoteName: 'upstream',
        remoteRefName: 'refs/heads/c0',
      },
    });
    assert.strictEqual(b0.getPush().getRefName().full(), 'refs/remotes/origin/bN');
    assert.strictEqual(b0.getPush().getRemoteName(), 'upstream');
    assert.strictEqual(b0.getPush().getRemoteRefName().full(), 'refs/heads/c0');

    const b1 = new Branch('b1', {
      upstream,
      push: {
        refName: 'refs/remotes/upstream/c1',
        remoteName: null,
        remoteRefName: 'refs/heads/c1',
      },
    });
    assert.strictEqual(b1.getPush().getRefName().full(), 'refs/remotes/upstream/c1');
    assert.strictEqual(b1.getPush().getRemoteName(), 'origin');
    assert.strictEqual(b1.getPush().getRemoteRefName().full(), 'refs/heads/c1');

    const b2 = new Branch('b2', {
      upstream,
      push: {
        refName: 'refs/remotes/upstream/c2',
        remoteName: 'upstream',
      },
    });
    assert.strictEqual(b2.getPush().getRefName().full(), 'refs/remotes/upstream/c2');
    assert.strictEqual(b2.getPush().getRemoteName(), 'upstream');
    assert.strictEqual(b2.getPush().getRemoteRefName().full(), 'refs/heads/bN');
  });

  it('creates a head branch', function() {
    const b = new Branch('current', {head: true});
    assert.isTrue(b.isHead());
  });

  it('creates a detached branch', function() {
    const b = new Branch('master~2', {detached: true});
    assert.isTrue(b.isDetached());
    assert.strictEqual(b.getName().full(), 'master~2');
    assert.strictEqual(b.getName().short(), 'master~2');
  });

  describe('refspecs', function() {
    let b;

    beforeEach(function() {
      b = new Branch('refs/heads/feature', {
        upstream: {
          refName: 'refs/remotes/from/source',
          remoteName: 'from',
          remoteRefName: 'refs/heads/source',
        },
        push: {
          refName: 'refs/remotes/to/sink',
          remoteName: 'to',
          remoteRefName: 'refs/heads/sink',
        },
      });
    });

    it('generates a fetch refspec', function() {
      assert.strictEqual(b.getFetchRefSpec(), 'refs/heads/source:refs/remotes/from/source');
    });

    it('generates a push refspec', function() {
      assert.strictEqual(b.getPushRefSpec(), 'refs/heads/feature:refs/heads/sink');
    });
  });

  it('has a null object', function() {
    assert.isFalse(nullBranch.getName().isPresent());
    assert.strictEqual(nullBranch.getName().full(), '');
    assert.strictEqual(nullBranch.getName().short(), '');
    assert.isFalse(nullBranch.getUpstream().isPresent());
    assert.isFalse(nullBranch.getPush().isPresent());

    for (const method of ['getPullRefSpec', 'getPushRefSpec', 'getSha']) {
      assert.strictEqual(nullBranch[method](), '');
    }

    for (const method of ['isHead', 'isDetached', 'isPresent']) {
      assert.isFalse(nullBranch[method]());
    }

    assert.isNull(nullBranch.getCommitterDate());
    assert.strictEqual(nullBranch.inspect(), '{nullBranch}');
  });
});
