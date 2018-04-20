import React from 'react';
import PropTypes from 'prop-types';
import {Emitter} from 'event-kit';
import {mount} from 'enzyme';

import Panel from '../../lib/views/panel';

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

describe('Panel', function() {
  let emitter, workspace;

  beforeEach(function() {
    emitter = new Emitter();

    workspace = {
      addLeftPanel: sinon.stub().returns({
        destroy: sinon.stub().callsFake(() => emitter.emit('destroy')),
        onDidDestroy: cb => emitter.on('destroy', cb),
        show: sinon.stub(),
        hide: sinon.stub(),
      }),
    };
  });

  afterEach(function() {
    emitter.dispose();
  });

  it('renders a React component into an Atom panel', function() {
    const wrapper = mount(
      <Panel workspace={workspace} location="left" options={{some: 'option'}}>
        <Component text="hello" />
      </Panel>,
    );

    assert.strictEqual(workspace.addLeftPanel.callCount, 1);
    const options = workspace.addLeftPanel.args[0][0];
    assert.strictEqual(options.some, 'option');
    assert.isTrue(options.visible);
    assert.isDefined(options.item.getElement());

    const panel = wrapper.instance().getPanel();
    wrapper.unmount();
    assert.strictEqual(panel.destroy.callCount, 1);
  });

  it('calls props.onDidClosePanel when the panel is destroyed unexpectedly', function() {
    const onDidClosePanel = sinon.stub();
    const wrapper = mount(
      <Panel workspace={workspace} location="left" onDidClosePanel={onDidClosePanel}>
        <Component text="hello" />
      </Panel>,
    );
    wrapper.instance().getPanel().destroy();
    assert.strictEqual(onDidClosePanel.callCount, 1);
  });

  describe('when updating the visible prop', function() {
    it('shows or hides the panel', function() {
      const wrapper = mount(
        <Panel workspace={workspace} location="left" visible={true}>
          <Component text="hello" />
        </Panel>,
      );

      const panel = wrapper.instance().getPanel();

      wrapper.setProps({visible: false});
      assert.strictEqual(panel.hide.callCount, 1);

      wrapper.setProps({visible: true});
      assert.strictEqual(panel.show.callCount, 1);
    });
  });
});
