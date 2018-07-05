import RemoteSet from '../../lib/models/remote-set';
import Remote from '../../lib/models/remote';

describe('RemoteSet', function() {
  const remotes = [
    new Remote('origin', 'git@github.com:origin/repo.git'),
    new Remote('upstream', 'git@github.com:upstream/repo.git'),
  ];

  it('creates an empty set', function() {
    const set = new RemoteSet();
    assert.isTrue(set.isEmpty());
    assert.strictEqual(set.size(), 0);
  });

  it('creates a set containing one or more Remotes', function() {
    const set = new RemoteSet(remotes);
    assert.isFalse(set.isEmpty());
    assert.strictEqual(set.size(), 2);
  });

  it('retrieves a Remote from the set by name', function() {
    const set = new RemoteSet(remotes);
    const remote = set.withName('upstream');
    assert.strictEqual(remote, remotes[1]);
  });

  it('returns a nullRemote for unknown remote names', function() {
    const set = new RemoteSet(remotes);
    const remote = set.withName('unknown');
    assert.isFalse(remote.isPresent());
  });

  it('iterates over the Remotes', function() {
    const set = new RemoteSet(remotes);
    assert.deepEqual(Array.from(set), remotes);
  });

  it('filters remotes by a predicate', function() {
    const set0 = new RemoteSet(remotes);
    const set1 = set0.filter(remote => remote.getName() === 'upstream');

    assert.notStrictEqual(set0, set1);
    assert.isTrue(set1.withName('upstream').isPresent());
    assert.isFalse(set1.withName('origin1').isPresent());
  });
});
