import React from 'react';
import {mount} from 'enzyme';

import MarkerLayer from '../../lib/atom/marker-layer';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

describe('MarkerLayer', function() {
  let atomEnv, editor, layer, layerID;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
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
    const wrapper = mount(
      <AtomTextEditor>
        <MarkerLayer handleID={setLayerID} />
      </AtomTextEditor>,
    );
    const theEditor = wrapper.instance().getModel();

    assert.isDefined(theEditor.getMarkerLayer(layerID));
  });
});
