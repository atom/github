/** @babel */

import sinon from 'sinon';

import ModelStateRegistry from '../../lib/models/model-state-registry';

const Type1 = {type: 1};
const Type2 = {type: 2};

const model1 = {model: 1};
const model2 = {model: 2};

describe('ModelStateRegistry', () => {
  beforeEach(() => {
    ModelStateRegistry.clearSavedState();
  });

  describe('#setModel', () => {
    it('saves the previous data to be restored later', () => {
      let data;
      const registry = new ModelStateRegistry(Type1, {
        initialModel: model1,
        save: () => data,
        restore: (saved = {}) => { data = saved; },
      });
      assert.deepEqual(data, {});
      data = {some: 'data'};
      registry.setModel(model2);
      assert.deepEqual(data, {});
      registry.setModel(model1);
      assert.deepEqual(data, {some: 'data'});
    });

    it('does not call save or restore if the model has not changed', () => {
      let data;
      const save = sinon.spy(() => data);
      const restore = sinon.spy((saved = {}) => { data = saved; });
      const registry = new ModelStateRegistry(Type1, {
        initialModel: model1,
        save,
        restore,
      });
      save.reset();
      restore.reset();
      registry.setModel(model1);
      assert.equal(save.callCount, 0);
      assert.equal(restore.callCount, 0);
    });

    it('does not call save or restore for a model that does not exist', () => {
      const save = sinon.stub();
      const restore = sinon.stub();
      const registry = new ModelStateRegistry(Type1, {
        initialModel: model1,
        save, restore,
      });

      save.reset();
      restore.reset();
      registry.setModel(null);
      assert.equal(save.callCount, 1);
      assert.equal(restore.callCount, 0);

      save.reset();
      restore.reset();
      registry.setModel(model1);
      assert.equal(save.callCount, 0);
      assert.equal(restore.callCount, 1);
    });
  });

  it('shares data across multiple instances given the same type and model', () => {
    let data;
    const registry1 = new ModelStateRegistry(Type1, {
      initialModel: model1,
      save: () => data,
      restore: (saved = {}) => { data = saved; },
    });
    data = {some: 'data'};
    registry1.setModel(model2);
    assert.deepEqual(data, {});
    data = {more: 'datas'};
    registry1.setModel(model1);

    let data2;
    const registry2 = new ModelStateRegistry(Type1, {
      initialModel: model1,
      save: () => data2,
      restore: (saved = {}) => { data2 = saved; },
    });
    assert.deepEqual(data2, {some: 'data'});
    registry2.setModel(model2);
    assert.deepEqual(data2, {more: 'datas'});
  });

  it('does not share data across multiple instances given the same model but a different type', () => {
    let data;
    const registry1 = new ModelStateRegistry(Type1, {
      initialModel: model1,
      save: () => data,
      restore: (saved = {}) => { data = saved; },
    });
    data = {some: 'data'};
    registry1.setModel(model2);
    assert.deepEqual(data, {});
    data = {more: 'datas'};
    registry1.setModel(model1);

    let data2;
    const registry2 = new ModelStateRegistry(Type2, {
      initialModel: model1,
      save: () => data2,
      restore: (saved = {}) => { data2 = saved; },
    });
    assert.deepEqual(data2, {});
    data2 = {evenMore: 'data'};
    registry2.setModel(model2);
    assert.deepEqual(data2, {});
    registry2.setModel(model1);
    assert.deepEqual(data2, {evenMore: 'data'});
  });
});
