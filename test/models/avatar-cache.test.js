import AvatarCache from '../../lib/models/avatar-cache';

describe('AvatarCache', function() {

  it("returns the URL of a placeholder when we haven't loaded it yet", function() {
    const cache = new AvatarCache(() => {});
    assert.deepEqual(cache.avatarsForEmails(['me@somewhere.com']), ['https://github.com/simurai.png']);
  });

  it("triggers a request callback when an avatar is requested for an email we don't have", function() {
    const request = sinon.spy();
    const cache = new AvatarCache(request);
    cache.addAll({'one@somewhere.com': 'https://one.com'});

    cache.avatarsForEmails(['one@somewhere.com', 'two@somewhere.com', 'three@somewhere.com']);
    assert.isTrue(request.calledWith(['two@somewhere.com', 'three@somewhere.com']));
  });

  it('returns a cached avatar URL', function() {
    const cache = new AvatarCache(() => {});
    cache.addAll({
      'kuychaco@github.com': 'https://github.com/kuychaco.png',
      'smashwilson@github.com': 'https://github.com/smashwilson.png',
    });
    assert.deepEqual(cache.avatarsForEmails(['kuychaco@github.com']), ['https://github.com/kuychaco.png']);
    assert.deepEqual(cache.avatarsForEmails(['smashwilson@github.com']), ['https://github.com/smashwilson.png']);
  });

  it('broadcasts an update when new avatars URL are resolved', function() {
    const cache = new AvatarCache(() => {});
    const didUpdate = sinon.spy();
    cache.onDidUpdate(didUpdate);

    cache.addAll({
      'kuychaco@github.com': 'https://github.com/kuychaco.png',
      'smashwilson@github.com': 'https://github.com/smashwilson.png',
    });
    assert.strictEqual(didUpdate.callCount, 1);
  });
});
