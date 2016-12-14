/** @babel */

import ModelStateTracker from '../../lib/models/model-state-tracker';

describe('ModelStateTracker', () => {
  it('serializes and deserializes data per model', () => {
    const model1 = {model: 1};
    const model2 = {model: 2};
    const context1 = {context: 2};
    const context2 = {context: 2};
    let data, lastSerializeModel, lastSerializeContext, lastDeserializeModel, lastDeserializeContext;
    const tracker = new ModelStateTracker({
      initialModel: model1,
      initialContext: context1,
      serialize: (model, context) => {
        lastSerializeModel = model;
        lastSerializeContext = context;
        return {...data};
      },
      deserialize: (state = {}, model, context) => {
        lastDeserializeModel = model;
        lastDeserializeContext = context;
        data = {...state};
      },
    });
    tracker.setContext(context1);

    assert.equal(lastDeserializeModel, model1);
    assert.equal(lastDeserializeContext, context1);
    assert.deepEqual(data, {});
    data = {
      hubber: 'kuychaco',
      start: [2015, 12, 15],
    };

    tracker.setModel(model2);
    assert.equal(lastSerializeModel, model1);
    assert.equal(lastSerializeContext, context1);
    assert.equal(lastDeserializeModel, model2);
    assert.equal(lastDeserializeContext, context1);
    assert.deepEqual(data, {});
    data = {
      hubber: 'BinaryMuse',
      start: [2016, 2, 16],
    };

    tracker.setContext(context2);
    tracker.setModel(model1);
    assert.equal(lastSerializeModel, model2);
    assert.equal(lastSerializeContext, context2);
    assert.equal(lastDeserializeModel, model1);
    assert.equal(lastDeserializeContext, context2);
    assert.deepEqual(data, {
      hubber: 'kuychaco',
      start: [2015, 12, 15],
    });

    tracker.setModel(model2);
    assert.equal(lastSerializeModel, model1);
    assert.equal(lastSerializeContext, context2);
    assert.equal(lastDeserializeModel, model2);
    assert.equal(lastDeserializeContext, context2);
    assert.deepEqual(data, {
      hubber: 'BinaryMuse',
      start: [2016, 2, 16],
    });
  });
});
