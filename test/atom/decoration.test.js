import React from 'react';
import {mount} from 'enzyme';
import {Range} from 'atom';

import Decoration from '../../lib/atom/decoration';
import AtomTextEditor from '../../lib/atom/atom-text-editor';
import Marker from '../../lib/atom/marker';
import MarkerLayer from '../../lib/atom/marker-layer';

describe('Decoration', function() {
  let atomEnv, workspace, editor, marker;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;

    editor = await workspace.open(__filename);
    marker = editor.markBufferRange([[2, 0], [6, 0]]);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('decorates its marker on render', function() {
    const app = (
      <Decoration
        editor={editor}
        decorable={marker}
        type="line"
        position="head"
        className="something"
      />
    );
    mount(app);

    assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'something'}), 1);
  });

  describe('with a subtree', function() {
    beforeEach(function() {
      sinon.spy(editor, 'decorateMarker');
    });

    it('creates a block decoration', function() {
      const app = (
        <Decoration editor={editor} decorable={marker} type="block" className="parent">
          <div className="decoration-subtree">
            This is a subtree
          </div>
        </Decoration>
      );
      mount(app);

      const args = editor.decorateMarker.firstCall.args;
      assert.equal(args[0], marker);
      assert.equal(args[1].type, 'block');
      const element = args[1].item.getElement();
      assert.strictEqual(element.className, 'react-atom-decoration parent');
      const child = element.firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });

    it('creates an overlay decoration', function() {
      const app = (
        <Decoration editor={editor} decorable={marker} type="overlay">
          <div className="decoration-subtree">
            This is a subtree
          </div>
        </Decoration>
      );
      mount(app);

      const args = editor.decorateMarker.firstCall.args;
      assert.equal(args[0], marker);
      assert.equal(args[1].type, 'overlay');
      const child = args[1].item.getElement().firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });

    it('creates a gutter decoration', function() {
      const app = (
        <Decoration editor={editor} decorable={marker} type="gutter">
          <div className="decoration-subtree">
            This is a subtree
          </div>
        </Decoration>
      );
      mount(app);

      const args = editor.decorateMarker.firstCall.args;
      assert.equal(args[0], marker);
      assert.equal(args[1].type, 'gutter');
      const child = args[1].item.getElement().firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });
  });

  describe('when called with changed props', function() {
    let wrapper, originalDecoration;

    beforeEach(function() {
      const app = (
        <Decoration
          editor={editor}
          decorable={marker}
          type="line"
          position="head"
          className="something"
        />
      );
      wrapper = mount(app);

      originalDecoration = editor.getLineDecorations({position: 'head', class: 'something'})[0];
    });

    it('redecorates when a new Editor and Marker are provided', async function() {
      const newEditor = await workspace.open(require.resolve('../../package.json'));
      const newMarker = newEditor.markBufferRange([[0, 0], [2, 0]]);

      wrapper.setProps({editor: newEditor, decorable: newMarker});

      assert.isTrue(originalDecoration.isDestroyed());
      assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'something'}), 0);
      assert.lengthOf(newEditor.getLineDecorations({position: 'head', class: 'something'}), 1);
    });

    it('redecorates when a new MarkerLayer is provided', function() {
      const newLayer = editor.addMarkerLayer();

      wrapper.setProps({decorable: newLayer, decorateMethod: 'decorateMarkerLayer'});

      assert.isTrue(originalDecoration.isDestroyed());
      assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'something'}), 0);

      // Turns out Atom doesn't provide any public way to query the markers on a layer.
      assert.lengthOf(
        Array.from(editor.decorationManager.layerDecorationsByMarkerLayer.get(newLayer)),
        1,
      );
    });

    it('updates decoration properties', function() {
      wrapper.setProps({className: 'different'});

      assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'something'}), 0);
      assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'different'}), 1);
      assert.isFalse(originalDecoration.isDestroyed());
      assert.strictEqual(originalDecoration.getProperties().class, 'different');
    });

    it('does not redecorate when the decorable is on the wrong TextEditor', async function() {
      const newEditor = await workspace.open(require.resolve('../../package.json'));

      wrapper.setProps({editor: newEditor});

      assert.isTrue(originalDecoration.isDestroyed());
      assert.lengthOf(editor.getLineDecorations({}), 0);
    });
  });

  it('destroys its decoration on unmount', function() {
    const app = (
      <Decoration
        editor={editor}
        decorable={marker}
        type="line"
        className="whatever"
      />
    );
    const wrapper = mount(app);

    assert.lengthOf(editor.getLineDecorations({class: 'whatever'}), 1);

    wrapper.unmount();

    assert.lengthOf(editor.getLineDecorations({class: 'whatever'}), 0);
  });

  it('decorates a parent Marker', function() {
    const wrapper = mount(
      <AtomTextEditor workspace={workspace}>
        <Marker bufferRange={Range.fromObject([[0, 0], [0, 0]])}>
          <Decoration type="line" className="whatever" position="head" />
        </Marker>
      </AtomTextEditor>,
    );
    const theEditor = wrapper.instance().getModel();

    assert.lengthOf(theEditor.getLineDecorations({position: 'head', class: 'whatever'}), 1);
  });

  it('decorates a parent MarkerLayer', function() {
    mount(
      <AtomTextEditor workspace={workspace}>
        <MarkerLayer>
          <Marker bufferRange={Range.fromObject([[0, 0], [0, 0]])} />
          <Decoration type="line" className="something" />
        </MarkerLayer>
      </AtomTextEditor>,
    );
  });

  it('does not attempt to decorate a destroyed Marker', function() {
    marker.destroy();

    const app = (
      <Decoration
        editor={editor}
        decorable={marker}
        type="line"
        position="head"
        className="something"
      />
    );
    mount(app);

    assert.lengthOf(editor.getLineDecorations(), 0);
  });

  it('does not attempt to decorate a destroyed TextEditor', function() {
    editor.destroy();

    const app = (
      <Decoration
        editor={editor}
        decorable={marker}
        type="line"
        position="head"
        className="something"
      />
    );
    mount(app);

    assert.lengthOf(editor.getLineDecorations(), 0);
  });
});
