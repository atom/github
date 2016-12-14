/** @babel */

import ModelStateTracker from '../../lib/models/model-state-tracker';

describe.only('ModelStateTracker', () => {
  it('serializes and deserializes data per model', () => {
    const model1 = Symbol('model1');
    const model2 = Symbol('model2');
    let data;
    const tracker = new ModelStateTracker(model1, {
      serialize: () => {
        return data;
      },
      deserialize: (state = {}) => {
        data = {...state};
      },
    });

    assert.deepEqual(data, {});
    data = {
      hubber: 'kuychaco',
      start: [2015, 12, 15],
    };

    tracker.setModel(model2);
    assert.deepEqual(data, {});
    data = {
      hubber: 'BinaryMuse',
      start: [2016, 2, 16],
    };

    tracker.setModel(model1);
    assert.deepEqual(data, {
      hubber: 'kuychaco',
      start: [2015, 12, 15],
    });

    tracker.setModel(model2);
    assert.deepEqual(data, {
      hubber: 'BinaryMuse',
      start: [2015, 2, 16],
    });
  });
});
