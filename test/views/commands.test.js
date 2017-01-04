/** @babel */

import React from 'react';
import {mount} from 'enzyme';

import Commands, {Command} from '../../lib/views/commands';

describe('Commands', () => {
  let atomEnv, commandRegistry;

  beforeEach(() => {
    atomEnv = global.buildAtomEnvironment();
    commandRegistry = atomEnv.commands;
  });

  afterEach(() => {
    atomEnv.destroy();
  });

  it('registers commands on mount and unregisters them on unmount', async () => {
    const callback1 = sinon.stub();
    const callback2 = sinon.stub();
    const element = document.createElement('div');
    const app = (
      <Commands registry={commandRegistry} target={element}>
        <Command command="github:do-thing1" callback={callback1} />
        <Command command="github:do-thing2" callback={callback2} />
      </Commands>
    );

    const wrapper = mount(app);
    commandRegistry.dispatch(element, 'github:do-thing1');
    assert.equal(callback1.callCount, 1);
    commandRegistry.dispatch(element, 'github:do-thing2');
    assert.equal(callback2.callCount, 1);

    await new Promise(resolve => {
      wrapper.setProps({children: <Command command="github:do-thing1" callback={callback1} />}, resolve);
    });

    callback1.reset();
    callback2.reset();
    commandRegistry.dispatch(element, 'github:do-thing1');
    assert.equal(callback1.callCount, 1);
    commandRegistry.dispatch(element, 'github:do-thing2');
    assert.equal(callback2.callCount, 0);

    wrapper.unmount();

    callback1.reset();
    callback2.reset();
    commandRegistry.dispatch(element, 'github:do-thing1');
    assert.equal(callback1.callCount, 0);
    commandRegistry.dispatch(element, 'github:do-thing2');
    assert.equal(callback2.callCount, 0);
  });

  it('updates commands when props change', async () => {
    const element = document.createElement('div');
    const callback1 = sinon.stub();
    const callback2 = sinon.stub();

    class App extends React.Component {
      render() {
        return (
          <Command
            registry={commandRegistry}
            target={element}
            command={this.props.command}
            callback={this.props.callback}
          />
        );
      }
    }

    const app = <App command="user:command1" callback={callback1} />;
    const wrapper = mount(app);

    commandRegistry.dispatch(element, 'user:command1');
    assert.equal(callback1.callCount, 1);

    await new Promise(resolve => {
      wrapper.setProps({command: 'user:command2', callback: callback2}, resolve);
    });

    callback1.reset();
    commandRegistry.dispatch(element, 'user:command1');
    assert.equal(callback1.callCount, 0);
    assert.equal(callback2.callCount, 0);
    commandRegistry.dispatch(element, 'user:command2');
    assert.equal(callback1.callCount, 0);
    assert.equal(callback2.callCount, 1);
  });
});
