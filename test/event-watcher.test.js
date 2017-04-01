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

    assert.strictEqual(await promise0, payload);
    assert.strictEqual(await promise1, payload);
  });

  it('creates new Promises for repeated events', async function() {
    const promise0 = watcher.getPromise('testing');

    watcher.resolvePromise('testing', 0);
    assert.equal(await promise0, 0);

    const promise1 = watcher.getPromise('testing');

    watcher.resolvePromise('testing', 1);
    assert.equal(await promise1, 1);
  });

  it('"resolves" an event that has no Promise', function() {
    watcher.resolvePromise('anybody-there', {});
  });

  it('rejects a Promise with an error', async function() {
    const promise = watcher.getPromise('testing');

    watcher.rejectPromise('testing', new Error('oh shit'));
    await assert.isRejected(promise, /oh shit/);
  });

  describe('function pairs', function() {
    const baseNames = Object.getOwnPropertyNames(EventWatcher.prototype)
      .map(methodName => /^get(.+)Promise$/.exec(methodName))
      .filter(match => match !== null)
      .map(match => match[1]);
    let functionPairs;

    beforeEach(function() {
      functionPairs = baseNames.map(baseName => {
        return {
          baseName,
          getter: watcher[`get${baseName}Promise`].bind(watcher),
          resolver: watcher[`resolve${baseName}Promise`].bind(watcher),
        };
      });
    });

    baseNames.forEach(baseName => {
      it(`resolves the correct Promise for ${baseName}`, async function() {
        const allPromises = [];
        const positiveResults = [];
        const negativeResults = [];

        let positiveResolver = null;
        const negativeResolvers = [];

        for (let i = 0; i < functionPairs.length; i++) {
          const functionPair = functionPairs[i];

          if (functionPair.baseName === baseName) {
            const positivePromise = functionPair.getter().then(payload => {
              positiveResults.push(payload);
            });
            allPromises.push(positivePromise);

            positiveResolver = functionPair.resolver;
          } else {
            const negativePromise = functionPair.getter().then(payload => {
              negativeResults.push(payload);
            });
            allPromises.push(negativePromise);

            negativeResolvers.push(functionPair.resolver);
          }
        }

        // Resolve positive resolvers with "yes" and negative resolvers with "no"
        positiveResolver('yes');
        negativeResolvers.forEach(resolver => resolver('no'));

        await Promise.all(allPromises);

        assert.lengthOf(positiveResults, 1);
        assert.isTrue(positiveResults.every(result => result === 'yes'));

        assert.lengthOf(negativeResults, baseNames.length - 1);
        assert.isTrue(negativeResults.every(result => result === 'no'));
      });
    });
  });
});
