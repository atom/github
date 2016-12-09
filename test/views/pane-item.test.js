/** @babel */

import React from 'react';
import sinon from 'sinon';

import PaneItem from '../../lib/views/pane-item';

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

describe('PaneItem component', () => {
  let renderer, emitter, workspace, activePane;
  beforeEach(() => {
    renderer = createRenderer();
    emitter = new Emitter();
    const paneItem = {
      destroy: sinon.spy(() => emitter.emit('destroy', {item: paneItem})),
    };
    activePane = {
      addItem: sinon.spy(item => {
        return paneItem;
      }),
      activateItem: sinon.stub(),
    };
    workspace = {
      getActivePane: sinon.stub().returns(activePane),
      paneForItem: sinon.stub().returns(activePane),
      onDidDestroyPaneItem: cb => emitter.on('destroy', cb),
    };
  });

  afterEach(() => {
    emitter.dispose();
  });

  it('renders a React component into an Atom pane item', () => {
    let portal, subtree;
    const item = Symbol('item');
    let app = (
      <PaneItem
        workspace={workspace}
        getItem={obj => {
          portal = obj.portal;
          subtree = obj.subtree;
          return item;
        }}>
        <Component text="hello" />
      </PaneItem>
    );
    renderer.render(app);
    assert.equal(activePane.addItem.callCount, 1);
    assert.deepEqual(activePane.addItem.args[0], [item]);
    assert.equal(portal.getElement().textContent, 'hello');
    assert.equal(subtree.getText(), 'hello');

    app = (
      <PaneItem
        workspace={workspace}
        getItem={obj => {
          return item;
        }}
        onDidCloseItem={() => { throw new Error('Expected onDidCloseItem not to be called'); }}>
        <Component text="world" />
      </PaneItem>
    );
    renderer.render(app);
    assert.equal(activePane.addItem.callCount, 1);
    assert.equal(portal.getElement().textContent, 'world');
    assert.equal(subtree.getText(), 'world');

    renderer.unmount();
    assert.equal(renderer.lastInstance.getPaneItem().destroy.callCount, 1);
  });

  it('calls props.onDidCloseItem when the pane item is destroyed unexpectedly', () => {
    const onDidCloseItem = sinon.stub();
    const app = (
      <PaneItem
        workspace={workspace}
        onDidCloseItem={onDidCloseItem}>
        <Component text="hello" />
      </PaneItem>
    );
    renderer.render(app);
    renderer.instance.getPaneItem().destroy();
    assert.equal(onDidCloseItem.callCount, 1);
  });
});
