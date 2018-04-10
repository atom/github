import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';

describe('BranchSet', function() {
  it('earmarks HEAD', function() {
    const bs = new BranchSet();
    bs.add(new Branch('foo'));
    bs.add(new Branch('bar', Branch.createRemoteTracking('upstream/bar', 'upstream', 'refs/heads/bar')));

    const current = new Branch('currentBranch', nullBranch, nullBranch, true);
    bs.add(current);

    assert.strictEqual(current, bs.getHeadBranch());
  });

  it('returns a nullBranch if no ref is HEAD', function() {
    const bs = new BranchSet();
    bs.add(new Branch('foo'));
    bs.add(new Branch('bar', Branch.createRemoteTracking('upstream/bar', 'upstream', 'refs/heads/bar')));

    assert.isFalse(bs.getHeadBranch().isPresent());
  });

  it('retrieves branches by remote ref name', function() {
    const bs = new BranchSet();
    bs.add(new Branch('foo'));

    const bar = new Branch('bar', Branch.createRemoteTracking('upstream/bar', 'upstream', 'refs/heads/bar'));
    bs.add(bar);

    const baz = new Branch('baz', Branch.createRemoteTracking('origin/baz', 'origin', 'refs/heads/remotes/wat/boop'));
    bs.add(baz);

    const boo = new Branch('boo',
      Branch.createRemoteTracking('upstream/boo', 'upstream', 'refs/heads/fetch-from-here'),
      Branch.createRemoteTracking('origin/boo', 'origin', 'refs/heads/push-to-here'),
    );
    bs.add(boo);

    assert.lengthOf(bs.getPullTargets('refs/heads/unknown'), 0);
    assert.lengthOf(bs.getPushSources('refs/heads/unknown'), 0);

    assert.deepEqual(bs.getPullTargets('refs/heads/bar'), [bar]);
    assert.deepEqual(bs.getPushSources('refs/heads/bar'), [bar]);

    assert.deepEqual(bs.getPullTargets('refs/heads/remotes/wat/boop'), [baz]);
    assert.deepEqual(bs.getPushSources('refs/heads/remotes/wat/boop'), [baz]);

    assert.deepEqual(bs.getPullTargets('refs/heads/fetch-from-here'), [boo]);
    assert.deepEqual(bs.getPushSources('refs/heads/push-to-here'), [boo]);

    assert.lengthOf(bs.getPullTargets('refs/heads/push-to-here'), 0);
    assert.lengthOf(bs.getPushSources('refs/heads/fetch-from-here'), 0);
  });
});
