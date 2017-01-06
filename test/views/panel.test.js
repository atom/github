import React from 'react';

import Panel from '../../lib/views/panel';

import {Emitter} from 'atom';

import {createRenderer} from '../helpers';

class Component extends React.Component {
  render() {
    return (
      <div>{this.props.text}</div>
    );
  }

  getText() {
    return this.props.text;
  }
}

describe('Panel component', function() {
  let renderer, emitter, workspace;
  beforeEach(function() {
    renderer = createRenderer();
    emitter = new Emitter();
    workspace = {
      addLeftPanel: sinon.stub().returns({
        destroy: sinon.spy(() => emitter.emit('destroy')),
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
    let portal, subtree;
    const item = Symbol('item');
    let app = (
      <Panel
        workspace={workspace}
        location="left"
        options={{some: 'option'}}
        getItem={obj => {
          portal = obj.portal;
          subtree = obj.subtree;
          return item;
        }}>
        <Component text="hello" />
      </Panel>
    );
    renderer.render(app);
    assert.equal(workspace.addLeftPanel.callCount, 1);
    assert.deepEqual(workspace.addLeftPanel.args[0], [{some: 'option', visible: true, item}]);
    assert.equal(portal.getElement().textContent, 'hello');
    assert.equal(subtree.getText(), 'hello');

    app = (
      <Panel
        workspace={workspace}
        location="left"
        options={{some: 'option'}}
        getItem={obj => {
          return item;
        }}
        onDidClosePanel={() => { throw new Error('Expected onDidClosePanel not to be called'); }}>
        <Component text="world" />
      </Panel>
    );
    renderer.render(app);
    assert.equal(workspace.addLeftPanel.callCount, 1);
    assert.equal(portal.getElement().textContent, 'world');
    assert.equal(subtree.getText(), 'world');

    renderer.unmount();
    assert.equal(renderer.lastInstance.getPanel().destroy.callCount, 1);
  });

  it('calls props.onDidClosePanel when the panel is destroyed unexpectedly', function() {
    const onDidClosePanel = sinon.stub();
    const app = (
      <Panel
        workspace={workspace}
        location="left"
        onDidClosePanel={onDidClosePanel}>
        <Component text="hello" />
      </Panel>
    );
    renderer.render(app);
    renderer.instance.getPanel().destroy();
    assert.equal(onDidClosePanel.callCount, 1);
  });

  describe('when updating the visible prop', function() {
    it('shows or hides the panel', function() {
      let app = (
        <Panel
          workspace={workspace}
          location="left"
          visible={true}>
          <Component text="hello" />
        </Panel>
      );
      renderer.render(app);

      const panel = renderer.instance.getPanel();
      app = (
        <Panel
          workspace={workspace}
          location="left"
          visible={false}>
          <Component text="hello" />
        </Panel>
      );
      renderer.render(app);
      assert.equal(panel.hide.callCount, 1);

      app = (
        <Panel
          workspace={workspace}
          location="left"
          visible={true}>
          <Component text="hello" />
        </Panel>
      );
      renderer.render(app);
      assert.equal(panel.show.callCount, 1);
    });
  });
});
