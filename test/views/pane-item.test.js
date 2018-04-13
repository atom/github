import React from 'react';
import {mount} from 'enzyme';
import PropTypes from 'prop-types';

import PaneItem from '../../lib/views/pane-item';

import {Emitter} from 'event-kit';

class Component extends React.Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
  }

  render() {
    return (
      <div>{this.props.text}</div>
    );
  }

  getText() {
    return this.props.text;
  }
}

describe('PaneItem component', function() {
  let emitter, workspace, activePane;

  beforeEach(function() {
    emitter = new Emitter();

    const paneItem = {
      destroy: sinon.stub().callsFake(() => emitter.emit('destroy', {item: paneItem})),
    };

    activePane = {
      addItem: sinon.stub().callsFake(() => paneItem),
      activateItem: sinon.stub(),
    };

    workspace = {
      getActivePane: sinon.stub().returns(activePane),
      paneForItem: sinon.stub().returns(activePane),
      onDidDestroyPaneItem: cb => emitter.on('destroy', cb),
    };
  });

  afterEach(function() {
    emitter.dispose();
  });

  it('renders a React component into an Atom pane item', function() {
    const item = Symbol('item');
    const wrapper = mount(
      <PaneItem workspace={workspace} getItem={() => item}>
        <Component text="hello" />
      </PaneItem>,
    );

    const paneItem = wrapper.instance().getPaneItem();

    assert.strictEqual(activePane.addItem.callCount, 1);
    assert.deepEqual(activePane.addItem.args[0], [item]);

    wrapper.unmount();

    assert.strictEqual(paneItem.destroy.callCount, 1);
  });

  it('calls props.onDidCloseItem when the pane item is destroyed unexpectedly', function() {
    const onDidCloseItem = sinon.stub();
    const wrapper = mount(
      <PaneItem workspace={workspace} onDidCloseItem={onDidCloseItem}>
        <Component text="hello" />
      </PaneItem>,
    );

    wrapper.instance().getPaneItem().destroy();
    assert.strictEqual(onDidCloseItem.callCount, 1);
  });
});
