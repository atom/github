/** @babel */

import React from 'react';
import {mount} from 'enzyme';
import etch from 'etch';

import EtchWrapper from '../../lib/views/etch-wrapper';


class EtchComponent {
  constructor(props) {
    this.updated = 0;
    this.destroyed = 0;
    this.props = props;
    etch.initialize(this);
  }

  update(props) {
    this.updated++;
    this.props = props;
    return etch.update(this);
  }

  destroy() {
    this.destroyed++;
    etch.destroy(this);
  }

  render() {
    return etch.dom('div', null, this.props.text);
  }
}

describe('EtchWrapper', () => {
  it('constructs a wrapped etch component with the given props', async () => {
    const app = (
      <EtchWrapper className="wrapper">
        <EtchComponent text="hello" other="world" />
      </EtchWrapper>
    );

    const wrapper = mount(app);
    const instance = wrapper.instance().getWrappedComponent();
    assert.equal(wrapper.text(), 'hello');
    assert.equal(instance.props.other, 'world');

    wrapper.setProps({children: <EtchComponent text="world" other="more" />});
    await etch.getScheduler().getNextUpdatePromise();
    assert.equal(wrapper.text(), 'world');
    assert.equal(instance.props.other, 'more');
    assert.equal(instance.updated, 1);

    wrapper.unmount();
    assert.equal(instance.destroyed, 1);
  });
});
