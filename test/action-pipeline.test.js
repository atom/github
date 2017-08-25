import {ActionPipelineManager, ActionPipeline} from '../lib/action-pipeline';

describe.only('ActionPipelineManager', function() {
  it('manages pipelines a set of actions', function() {
    const actionNames = ['ONE', 'TWO'];
    const manager = new ActionPipelineManager({actionNames});

    assert.ok(manager.getPipeline(manager.actions.ONE));
    assert.ok(manager.getPipeline(manager.actions.TWO));
    assert.throws(() => manager.getPipeline(manager.actions.THREE), /not a known action/);

    const pipeline = manager.getPipeline(manager.actions.ONE);
    assert.equal(manager.actions.ONE, pipeline.action);
  });
});

describe.only('ActionPipeline', function() {
  let pipeline;
  beforeEach(function() {
    pipeline = new ActionPipeline(Symbol('TEST_ACTION'));
  });

  it('runs actions with no middleware', async function() {
    const base = (a, b) => a + b;
    const result = await pipeline.run(base, 1, 2);
    assert.equal(result, 3);
  });

  it('requires middleware to have a name', function() {
    assert.throws(() => pipeline.addMiddleware(null, () => null), /must be registered with a unique middleware name/);
  });

  it('only allows a single instance of a given middleware based on name', function() {
    pipeline.addMiddleware('testMiddleware', () => null);
    assert.throws(() => pipeline.addMiddleware('testMiddleware', () => null),
      /testMiddleware.*already registered/);
  });

  it('registers middleware to run around the function', async function() {
    const capturedArgs = [];
    const capturedResults = [];
    const options = {a: 1, b: 2};

    pipeline.addMiddleware('testMiddleware', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a += 1;
      opts.b += 2;
      const result = next();
      capturedResults.push(result);
      return result + 1;
    });

    pipeline.addMiddleware('testMiddleware2', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a *= 2;
      opts.b *= 3;
      const result = next();
      capturedResults.push(result);
      return result * 2;
    });

    const base = ({a, b}) => a + b;
    const result = await pipeline.run(base, options);
    assert.deepEqual(capturedArgs, [[1, 2], [2, 4]]);
    assert.deepEqual(capturedResults, [16, 32]);
    assert.equal(result, 33);
  });

  it('allows removing middleware by name', async function() {
    const capturedArgs = [];
    const capturedResults = [];
    const options = {a: 1, b: 2};

    pipeline.addMiddleware('testMiddleware', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a += 1;
      opts.b += 2;
      const result = next();
      capturedResults.push(result);
      return result + 1;
    });

    pipeline.addMiddleware('testMiddleware2', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a *= 2;
      opts.b *= 3;
      const result = next();
      capturedResults.push(result);
      return result * 2;
    });

    pipeline.removeMiddleware('testMiddleware');

    const base = ({a, b}) => a + b;
    const result = await pipeline.run(base, options);
    assert.deepEqual(capturedArgs, [[1, 2]]);
    assert.deepEqual(capturedResults, [8]);
    assert.equal(result, 16);
  });

  it('allows inserting middleware before another by name', async function() {
    const capturedArgs = [];
    const capturedResults = [];
    const options = {a: 1, b: 2};

    pipeline.addMiddleware('testMiddleware', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a += 1;
      opts.b += 2;
      const result = next();
      capturedResults.push(result);
      return result + 1;
    });

    pipeline.insertMiddlewareBefore('testMiddleware', 'testMiddleware2', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a *= 2;
      opts.b *= 3;
      const result = next();
      capturedResults.push(result);
      return result * 2;
    });

    const base = ({a, b}) => a + b;
    const result = await pipeline.run(base, options);
    assert.deepEqual(capturedArgs, [[1, 2], [2, 6]]);
    assert.deepEqual(capturedResults, [11, 12]);
    assert.equal(result, 24);
  });

  it('allows inserting middleware after another by name', async function() {
    const capturedArgs = [];
    const capturedResults = [];
    const options = {a: 1, b: 2};

    pipeline.addMiddleware('testMiddleware', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a += 1;
      opts.b += 2;
      const result = next();
      capturedResults.push(result);
      return result + 1;
    });

    pipeline.insertMiddlewareAfter('testMiddleware', 'testMiddleware2', (next, opts) => {
      capturedArgs.push([opts.a, opts.b]);
      opts.a *= 2;
      opts.b *= 3;
      const result = next();
      capturedResults.push(result);
      return result * 2;
    });

    const base = ({a, b}) => a + b;
    const result = await pipeline.run(base, options);
    assert.deepEqual(capturedArgs, [[1, 2], [2, 4]]);
    assert.deepEqual(capturedResults, [16, 32]);
    assert.equal(result, 33);
  });
});
