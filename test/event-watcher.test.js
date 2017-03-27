import EventWatcher from '../lib/event-watcher';

describe('EventWatcher', function() {
  let watcher;

  beforeEach(function() {
    watcher = new EventWatcher();
  });

  it('creates and resolves a Promise for an event', async function() {
    const promise = watcher.getPromise('testing');

    const payload = {};
    watcher.resolvePromise('testing', payload);

    const result = await promise;
    assert.strictEqual(result, payload);
  });

  it('supports multiple consumers of the same Promise', async function() {
    const promise0 = watcher.getPromise('testing');
    const promise1 = watcher.getPromise('testing');
    assert.strictEqual(promise0, promise1);

    const payload = {};
    watcher.resolvePromise('testing', payload);

    const result0 = await promise0;
    const result1 = await promise1;
    assert.strictEqual(result0, payload);
    assert.strictEqual(result1, payload);
  });

  it('"resolves" an event that has no Promise', function() {
    watcher.resolvePromise('anybody-there', {});
  });

  it('rejects a Promise with an error', async function() {
    const promise = watcher.getPromise('testing');

    watcher.rejectPromise('testing', new Error('oh shit'));
    await assert.isRejected(promise, /oh shit/);
  });
});
