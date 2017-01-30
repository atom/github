import React from 'react';
import sinon from 'sinon';
import {mount} from 'enzyme';

import Decoration from '../../lib/views/decoration';

describe('Decoration', () => {
  let atomEnv, editor, marker;

  beforeEach(async () => {
    atomEnv = global.buildAtomEnvironment();
    const workspace = atomEnv.workspace;

    editor = await workspace.open(__filename);
    marker = editor.markBufferRange([[2, 0], [6, 0]]);
  });

  afterEach(() => atomEnv.destroy());

  it('decorates its marker on render', () => {
    const app = (
      <Decoration
        editor={editor}
        marker={marker}
        type="line"
        position="head"
        class="something"
      />
    );
    mount(app);

    assert.lengthOf(editor.getLineDecorations({position: 'head', class: 'something'}), 1);
  });

  describe('with a subtree', () => {
    beforeEach(() => {
      sinon.spy(editor, 'decorateMarker');
    });

    it('creates a block decoration', () => {
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
      const child = args[1].item.firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });

    it('creates an overlay decoration', () => {
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
      const child = args[1].item.firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });

    it('creates a gutter decoration', () => {
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
      const child = args[1].item.firstElementChild;
      assert.equal(child.className, 'decoration-subtree');
      assert.equal(child.textContent, 'This is a subtree');
    });
  });

  it('destroys its decoration on unmount', () => {
    const app = (
      <Decoration
        editor={editor}
        marker={marker}
        type="line"
        class="whatever"
      />
    );
    const wrapper = mount(app);

    assert.lengthOf(editor.getLineDecorations({class: 'whatever'}), 1);

    wrapper.unmount();

    assert.lengthOf(editor.getLineDecorations({class: 'whatever'}), 0);
  });
});
