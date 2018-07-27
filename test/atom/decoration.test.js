import React from 'react';
import sinon from 'sinon';
import {mount} from 'enzyme';

import Decoration from '../../lib/atom/decoration';
import AtomTextEditor from '../../lib/atom/atom-text-editor';
import Marker from '../../lib/atom/marker';
import MarkerLayer from '../../lib/atom/marker-layer';
import {fromBufferRange, fromBufferPosition} from '../../lib/models/marker-position';

describe('Decoration', function() {
  let atomEnv, editor, marker;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    const workspace = atomEnv.workspace;

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
        marker={marker}
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
        <Decoration editor={editor} marker={marker} type="block">
          <div className="decoration-subtree">
            This is a subtree
          </div>
        </Decoration>
      );
      mount(app);

      const args = editor.decorateMarker.firstCall.args;
      assert.equal(args[0], marker);
      assert.equal(args[1].type, 'block');
      const child = args[1].item.getElement().firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });

    it('creates an overlay decoration', function() {
      const app = (
        <Decoration editor={editor} marker={marker} type="overlay">
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
        <Decoration editor={editor} marker={marker} type="gutter">
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

  it('destroys its decoration on unmount', function() {
    const app = (
      <Decoration
        editor={editor}
        marker={marker}
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
      <AtomTextEditor>
        <Marker position={fromBufferRange([[0, 0], [0, 0]])}>
          <Decoration type="line" className="whatever" position="head" />
        </Marker>
      </AtomTextEditor>,
    );
    const theEditor = wrapper.instance().getModel();

    assert.lengthOf(theEditor.getLineDecorations({position: 'head', class: 'whatever'}), 1);
  });

  it('decorates a parent MarkerLayer', function() {
    mount(
      <AtomTextEditor>
        <MarkerLayer>
          <Marker position={fromBufferPosition([0, 0])} />
          <Decoration type="line" className="something" />
        </MarkerLayer>
      </AtomTextEditor>,
    );
  });
});
