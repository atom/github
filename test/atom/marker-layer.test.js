import React from 'react';
import {mount} from 'enzyme';

import MarkerLayer from '../../lib/atom/marker-layer';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

describe('MarkerLayer', function() {
  let atomEnv, editor, layerID;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    editor = await atomEnv.workspace.open(__filename);
  });

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
      />,
    );

    const layer = editor.getMarkerLayer(layerID);
    assert.isTrue(layer.bufferMarkerLayer.maintainHistory);
    assert.isTrue(layer.bufferMarkerLayer.persistent);
  });

  it('removes its layer on unmount', function() {
    const wrapper = mount(<MarkerLayer editor={editor} handleID={setLayerID} />);

    assert.isDefined(editor.getMarkerLayer(layerID));
    wrapper.unmount();
    assert.isUndefined(editor.getMarkerLayer(layerID));
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
