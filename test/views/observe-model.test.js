import {Emitter} from 'event-kit';

import React from 'react';
import {mount} from 'enzyme';

import ObserveModel from '../../lib/views/observe-model';

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

class TestComponent extends React.Component {
  render() {
    return (
      <ObserveModel model={this.props.testModel} fetchData={model => model.getData()}>
        {data => (
          data ? <div>{data.one} - {data.two}</div> : <div>no data</div>
        )}
      </ObserveModel>
    );
  }
}

describe('ObserveModel', function() {
  it('watches a model, re-rendering a child function when it changes', async function() {
    const model = new TestModel({one: 1, two: 2});
    const app = <TestComponent testModel={model} />;
    const wrapper = mount(app);

    await assert.async.equal(wrapper.text(), '1 - 2');

    model.update({one: 'one', two: 'two'});
    await assert.async.equal(wrapper.text(), 'one - two');

    wrapper.setProps({testModel: null});
    await assert.async.equal(wrapper.text(), 'no data');

    const model2 = new TestModel({one: 1, two: 2});
    wrapper.setProps({testModel: model2});
    await assert.async.equal(wrapper.text(), '1 - 2');
  });
});
