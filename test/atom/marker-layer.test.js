import React from 'react';
import {mount} from 'enzyme';

import MarkerLayer from '../../lib/atom/marker-layer';
import RefHolder from '../../lib/models/ref-holder';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

describe('MarkerLayer', function() {
  let atomEnv, workspace, editor, layer, layerID;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    editor = await atomEnv.workspace.open(__filename);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function setLayer(object) {
    layer = object;
  }

  function setLayerID(id) {
    layerID = id;
  }

  it('adds its layer on mount', function() {
    mount(
      <MarkerLayer
        editor={editor}
        maintainHistory={true}
        persistent={true}
        handleID={setLayerID}
        handleLayer={setLayer}
      />,
    );

    const theLayer = editor.getMarkerLayer(layerID);
    assert.strictEqual(theLayer, layer);
    assert.isTrue(theLayer.bufferMarkerLayer.maintainHistory);
    assert.isTrue(theLayer.bufferMarkerLayer.persistent);
  });

  it('removes its layer on unmount', function() {
    const wrapper = mount(<MarkerLayer editor={editor} handleID={setLayerID} handleLayer={setLayer} />);

    assert.isDefined(editor.getMarkerLayer(layerID));
    assert.isDefined(layer);
    wrapper.unmount();
    assert.isUndefined(editor.getMarkerLayer(layerID));
    assert.isUndefined(layer);
  });

  it('inherits an editor from a parent node', function() {
    const refEditor = new RefHolder();
    mount(
      <AtomTextEditor workspace={workspace} refModel={refEditor}>
        <MarkerLayer handleID={setLayerID} />
      </AtomTextEditor>,
    );
    const theEditor = refEditor.get();

    assert.isDefined(theEditor.getMarkerLayer(layerID));
  });

  describe('with an externally managed layer', function() {
    it('locates its marker layer by ID', function() {
      const external = editor.addMarkerLayer();
      const wrapper = mount(<MarkerLayer editor={editor} id={external.id} />);
      assert.strictEqual(wrapper.find('BareMarkerLayer').instance().layerHolder.get(), external);
    });

    it('locates a marker layer on the buffer', function() {
      const external = editor.getBuffer().addMarkerLayer();
      const wrapper = mount(<MarkerLayer editor={editor} id={external.id} />);
      assert.strictEqual(wrapper.find('BareMarkerLayer').instance().layerHolder.get().bufferMarkerLayer, external);
    });

    it('fails on construction if its ID is invalid', function() {
      assert.throws(() => mount(<MarkerLayer editor={editor} id={800} />), /Invalid marker layer ID: 800/);
    });

    it('does not destroy its layer on unmount', function() {
      const external = editor.addMarkerLayer();
      const wrapper = mount(<MarkerLayer editor={editor} id={external.id} />);
      wrapper.unmount();
      assert.isFalse(external.isDestroyed());
    });
  });
});
