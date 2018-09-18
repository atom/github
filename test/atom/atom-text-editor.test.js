import React from 'react';
import {mount} from 'enzyme';
import {TextBuffer} from 'atom';

import RefHolder from '../../lib/models/ref-holder';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

describe('AtomTextEditor', function() {
  let atomEnv, workspace, refModel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    refModel = new RefHolder();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('creates a text editor element', function() {
    const app = mount(
      <AtomTextEditor workspace={workspace} refModel={refModel} />,
    );

    const children = app.find('div').getDOMNode().children;
    assert.lengthOf(children, 1);
    const child = children[0];
    assert.isTrue(workspace.isTextEditor(child.getModel()));
    assert.strictEqual(child.getModel(), refModel.getOr(undefined));
  });

  it('creates its own model ref if one is not provided by a parent', function() {
    const app = mount(<AtomTextEditor workspace={workspace} />);
    assert.isTrue(workspace.isTextEditor(app.instance().refModel.get()));
  });

  it('configures the created text editor with props', function() {
    mount(
      <AtomTextEditor
        workspace={workspace}
        refModel={refModel}
        mini={true}
        readOnly={true}
        placeholderText="hooray"
        lineNumberGutterVisible={false}
        autoWidth={true}
        autoHeight={false}
      />,
    );

    const editor = refModel.get();

    assert.isTrue(editor.isMini());
    assert.isTrue(editor.isReadOnly());
    assert.strictEqual(editor.getPlaceholderText(), 'hooray');
    assert.isFalse(editor.lineNumberGutter.isVisible());
    assert.isTrue(editor.getAutoWidth());
    assert.isFalse(editor.getAutoHeight());
  });

  it('accepts a precreated buffer', function() {
    const buffer = new TextBuffer();
    buffer.setText('precreated');

    mount(
      <AtomTextEditor
        workspace={workspace}
        refModel={refModel}
        buffer={buffer}
      />,
    );

    const editor = refModel.get();

    assert.strictEqual(editor.getText(), 'precreated');

    buffer.setText('changed');
    assert.strictEqual(editor.getText(), 'changed');
  });

  it('updates changed attributes on re-render', function() {
    const app = mount(
      <AtomTextEditor
        workspace={workspace}
        refModel={refModel}
        readOnly={true}
      />,
    );

    const editor = refModel.get();
    assert.isTrue(editor.isReadOnly());

    app.setProps({readOnly: false});

    assert.isFalse(editor.isReadOnly());
  });

  it('destroys its text editor on unmount', function() {
    const app = mount(
      <AtomTextEditor
        workspace={workspace}
        refModel={refModel}
        readOnly={true}
      />,
    );

    const editor = refModel.get();
    sinon.spy(editor, 'destroy');

    app.unmount();

    assert.isTrue(editor.destroy.called);
  });

  describe('event subscriptions', function() {
    let handler, buffer;

    beforeEach(function() {
      handler = sinon.spy();

      buffer = new TextBuffer({
        text: 'one\ntwo\nthree\nfour\nfive\n',
      });
    });

    it('triggers didChangeCursorPosition when the cursor position changes', function() {
      mount(
        <AtomTextEditor
          workspace={workspace}
          refModel={refModel}
          buffer={buffer}
          didChangeCursorPosition={handler}
        />,
      );

      const editor = refModel.get();
      editor.setCursorBufferPosition([2, 3]);

      assert.isTrue(handler.called);
      const [{newBufferPosition}] = handler.lastCall.args;
      assert.deepEqual(newBufferPosition.serialize(), [2, 3]);

      handler.resetHistory();
      editor.setCursorBufferPosition([2, 3]);
      assert.isFalse(handler.called);
    });

    it('triggers didAddSelection when a selection is added', function() {
      mount(
        <AtomTextEditor
          workspace={workspace}
          refModel={refModel}
          buffer={buffer}
          didAddSelection={handler}
        />,
      );

      const editor = refModel.get();
      editor.addSelectionForBufferRange([[1, 0], [3, 3]]);

      assert.isTrue(handler.called);
      const [selection] = handler.lastCall.args;
      assert.deepEqual(selection.getBufferRange().serialize(), [[1, 0], [3, 3]]);
    });

    it("triggers didChangeSelectionRange when an existing selection's range is altered", function() {
      mount(
        <AtomTextEditor
          workspace={workspace}
          refModel={refModel}
          buffer={buffer}
          didChangeSelectionRange={handler}
        />,
      );

      const editor = refModel.get();
      editor.setSelectedBufferRange([[2, 0], [2, 1]]);
      const [selection] = editor.getSelections();
      assert.isTrue(handler.called);
      handler.resetHistory();

      selection.setBufferRange([[2, 2], [2, 3]]);
      assert.isTrue(handler.called);
      const [payload] = handler.lastCall.args;
      if (payload) {
        assert.deepEqual(payload.oldBufferRange.serialize(), [[2, 0], [2, 1]]);
        assert.deepEqual(payload.oldScreenRange.serialize(), [[2, 0], [2, 1]]);
        assert.deepEqual(payload.newBufferRange.serialize(), [[2, 2], [2, 3]]);
        assert.deepEqual(payload.newScreenRange.serialize(), [[2, 2], [2, 3]]);
        assert.strictEqual(payload.selection, selection);
      }
    });

    it('triggers didDestroySelection when an existing selection is destroyed', function() {
      mount(
        <AtomTextEditor
          workspace={workspace}
          refModel={refModel}
          buffer={buffer}
          didDestroySelection={handler}
        />,
      );

      const editor = refModel.get();
      editor.setSelectedBufferRanges([
        [[2, 0], [2, 1]],
        [[3, 0], [3, 1]],
      ]);
      const selection1 = editor.getSelections()[1];
      assert.isFalse(handler.called);

      editor.setSelectedBufferRange([[1, 0], [1, 2]]);
      assert.isTrue(handler.calledWith(selection1));
    });
  });

  it('detects DOM node membership', function() {
    const wrapper = mount(
      <AtomTextEditor workspace={workspace} refModel={refModel} />,
    );

    const children = wrapper.find('div').getDOMNode().children;
    assert.lengthOf(children, 1);
    const child = children[0];
    const instance = wrapper.instance();

    assert.isTrue(instance.contains(child));
    assert.isFalse(instance.contains(document.body));
  });

  it('focuses its editor element', function() {
    const wrapper = mount(
      <AtomTextEditor workspace={workspace} refModel={refModel} />,
    );

    const children = wrapper.find('div').getDOMNode().children;
    assert.lengthOf(children, 1);
    const child = children[0];
    sinon.spy(child, 'focus');

    const instance = wrapper.instance();
    instance.focus();
    assert.isTrue(child.focus.called);
  });
});
