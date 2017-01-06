import {Emitter} from 'atom';
import ModelObserver from '../../lib/models/model-observer';

describe('ModelObserver', function() {
  it('keeps asynchronously-queried model data in sync with the assigned active model', async function() {
    const observer = new ModelObserver({fetchData: async model => {
      return {
        a: await model.fetchA(),
        b: await model.fetchB(),
      };
    }});

    class Model {
      constructor(a, b) {
        this.a = a;
        this.b = b;
        this.fetchACallCount = 0;
        this.fetchBCallCount = 0;
        this.emitter = new Emitter();
      }
      onDidUpdate(didUpdate) {
        return this.emitter.on('did-update', didUpdate);
      }
      emitDidUpdate() {
        this.emitter.emit('did-update');
      }
      fetchA() {
        this.fetchACallCount++;
        return Promise.resolve(this.a);
      }
      fetchB() {
        this.fetchBCallCount++;
        return Promise.resolve(this.b);
      }
    }

    const model1 = new Model('a', 'b');
    const model2 = new Model('A', 'B');

    assert.isNull(observer.getActiveModel());
    assert.isNull(observer.getActiveModelData());

    observer.setActiveModel(model1);
    assert.equal(observer.getActiveModel(), model1);
    assert.isNull(observer.getActiveModelData());

    await observer.getLastModelDataRefreshPromise();
    assert.equal(observer.getActiveModel(), model1);
    assert.deepEqual(observer.getActiveModelData(), {a: 'a', b: 'b'});

    observer.setActiveModel(model2);
    assert.equal(observer.getActiveModel(), model2);
    assert.isNull(observer.getActiveModelData());

    // We unsubscribe from updates on the previous active model once we attempt to set a new one
    model1.a = 'X';
    model1.emitDidUpdate();
    assert.equal(model1.fetchACallCount, 1);
    assert.equal(model1.fetchBCallCount, 1);

    await observer.getLastModelDataRefreshPromise();
    assert.equal(observer.getActiveModel(), model2);
    assert.deepEqual(observer.getActiveModelData(), {a: 'A', b: 'B'});

    // We re-query the current active model if it emits an update event
    model2.a = 'Y';
    model2.emitDidUpdate();
    assert.equal(observer.getActiveModel(), model2);
    assert.deepEqual(observer.getActiveModelData(), {a: 'A', b: 'B'});

    await observer.getLastModelDataRefreshPromise();
    assert.equal(observer.getActiveModel(), model2);
    assert.deepEqual(observer.getActiveModelData(), {a: 'Y', b: 'B'});

    await observer.setActiveModel(null); // does not blow up
    assert.isNull(observer.getActiveModel());
    assert.isNull(observer.getActiveModelData());
  });

  it('emits an update event when the model changes and when data is fetched', async function() {
    let expectedActiveModelInUpdateCallback;
    const didUpdate = () => {
      assert.equal(observer.getActiveModel(), expectedActiveModelInUpdateCallback);
      didUpdate.callCount++;
    };
    didUpdate.callCount = 0;

    const observer = new ModelObserver({
      fetchData: async model => {
        return {a: await model.fetch()};
      },
      didUpdate,
    });

    class Model {
      constructor() {
        this.emitter = new Emitter();
      }
      onDidUpdate(didUpdateCallback) {
        return this.emitter.on('did-update', didUpdateCallback);
      }
      emitDidUpdate() {
        this.emitter.emit('did-update');
      }
      fetch() {
        return Promise.resolve('a');
      }
    }

    const model1 = new Model();
    const model2 = new Model();

    expectedActiveModelInUpdateCallback = model1;
    observer.setActiveModel(model1);
    assert.equal(didUpdate.callCount, 1);
    await observer.getLastModelDataRefreshPromise();
    assert.equal(didUpdate.callCount, 2);

    model1.emitDidUpdate();
    assert.equal(didUpdate.callCount, 2);
    await observer.getLastModelDataRefreshPromise();
    assert.equal(didUpdate.callCount, 3);

    expectedActiveModelInUpdateCallback = model2;
    observer.setActiveModel(model2);
    assert.equal(didUpdate.callCount, 4);
    await observer.getLastModelDataRefreshPromise();
    assert.equal(didUpdate.callCount, 5);
  });

  it('only assigns model data from the most recently initiated fetch', async function() {
    const observer = new ModelObserver({fetchData: async model => {
      return {a: await model.fetch()};
    }});

    class Model {
      constructor() {
        this.emitter = new Emitter();
      }
      onDidUpdate(didUpdate) {
        return this.emitter.on('did-update', didUpdate);
      }
      emitDidUpdate() {
        this.emitter.emit('did-update');
      }
      fetch() {
        return new Promise(resolve => {
          this.resolveFetch = resolve;
        });
      }
    }

    const model1 = new Model();
    const model2 = new Model();

    // This is kinda complicated... basically, we're simulating the assignment
    // of a *new* active model in the middle of a fetch caused by an update
    // event on the *previous* active model. When the fetch on the previous
    // active model finishes, we want to discard its result if it is no longer
    // the most recently initiated fetch. This ensures that the active model
    // data always belongs to the current active model.
    const setModel1Promise = observer.setActiveModel(model1);
    model1.resolveFetch('a');
    await setModel1Promise;

    model1.emitDidUpdate();
    const model1RefreshPromise = observer.getLastModelDataRefreshPromise();

    const setModel2Promise = observer.setActiveModel(model2);
    model2.resolveFetch('b');
    await setModel2Promise;
    model1.resolveFetch('x');

    await model1RefreshPromise;
    assert.equal(observer.getActiveModel(), model2);
    assert.deepEqual(observer.getActiveModelData(), {a: 'b'});
  });
});
