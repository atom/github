import React from 'react';

import Portal from '../../lib/views/portal';

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

describe('Portal', function() {
  let renderer;

  beforeEach(function() {
    renderer = createRenderer();
  });

  it('renders a subtree into a different dom node', function() {
    renderer.render(<Portal><Component text="hello" /></Portal>);
    assert.strictEqual(renderer.instance.getElement().textContent, 'hello');
    assert.strictEqual(renderer.instance.getRenderedSubtree().getText(), 'hello');
    const oldSubtree = renderer.instance.getRenderedSubtree();

    renderer.render(<Portal><Component text="world" /></Portal>);
    assert.strictEqual(renderer.lastInstance, renderer.instance);
    assert.strictEqual(oldSubtree, renderer.instance.getRenderedSubtree());
    assert.strictEqual(renderer.instance.getElement().textContent, 'world');
    assert.strictEqual(renderer.instance.getRenderedSubtree().getText(), 'world');
  });

  it('fetches an existing DOM node if getDOMNode() is passed', function() {
    let el = null;
    const getNode = function() {
      if (!el) {
        el = document.createElement('div');
      }

      return el;
    };

    renderer.render(
      <Portal getDOMNode={getNode}>
        <Component text="hello" />
      </Portal>,
    );

    assert.equal(el.textContent, 'hello');
  });

  it('constructs a view facade that delegates methods to the root DOM node and component instance', function() {
    renderer.render(<Portal><Component text="yo" /></Portal>);

    const view = renderer.instance.getView();

    assert.strictEqual(view.getElement().textContent, 'yo');
    assert.strictEqual(view.getText(), 'yo');
    assert.strictEqual(view.getPortal(), renderer.instance);
    assert.strictEqual(view.getInstance().getText(), 'yo');
  });
});
