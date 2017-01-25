import {Emitter} from 'atom';

import React from 'react';
import {mount} from 'enzyme';

import ObserveModel from '../../lib/decorators/observe-model';

class TestModel {
  constructor(data) {
    this.emitter = new Emitter();
    this.data = data;
  }

  update(data) {
    this.data = data;
    this.didUpdate();
  }

  getData() {
    return Promise.resolve(this.data);
  }

  didUpdate() {
    return this.emitter.emit('did-update');
  }

  onDidUpdate(cb) {
    return this.emitter.on('did-update', cb);
  }
}

@ObserveModel({
  getModel: props => props.testModel,
  fetchData: model => model.getData(),
})
class TestComponent extends React.Component {
  render() {
    return null;
  }
}

describe('ObserveModel', function() {
  it('wraps a component, re-rendering with specified props when it changes', async function() {
    const model = new TestModel({one: 1, two: 2});
    const app = <TestComponent testModel={model} />;
    const wrapper = mount(app);

    assert.isTrue(wrapper.is('ObserveModel(TestComponent)'));

    await assert.async.equal(wrapper.find('TestComponent').prop('one'), 1);
    await assert.async.equal(wrapper.find('TestComponent').prop('two'), 2);
    await assert.async.equal(wrapper.find('TestComponent').prop('testModel'), model);

    model.update({one: 'one', two: 'two'});
    await assert.async.equal(wrapper.find('TestComponent').prop('one'), 'one');
    await assert.async.equal(wrapper.find('TestComponent').prop('two'), 'two');
    await assert.async.equal(wrapper.find('TestComponent').prop('testModel'), model);

    wrapper.setProps({testModel: null});
    await assert.async.equal(wrapper.find('TestComponent').prop('one'), undefined);
    await assert.async.equal(wrapper.find('TestComponent').prop('two'), undefined);
    await assert.async.isNull(wrapper.find('TestComponent').prop('testModel'));

    const model2 = new TestModel({one: 1, two: 2});
    wrapper.setProps({testModel: model2});
    await assert.async.equal(wrapper.find('TestComponent').prop('one'), 1);
    await assert.async.equal(wrapper.find('TestComponent').prop('two'), 2);
    await assert.async.equal(wrapper.find('TestComponent').prop('testModel'), model2);
  });
});
