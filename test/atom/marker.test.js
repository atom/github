import React from 'react';
import {mount} from 'enzyme';
import {Range} from 'atom';

import Marker from '../../lib/atom/marker';
import AtomTextEditor from '../../lib/atom/atom-text-editor';
import MarkerLayer from '../../lib/atom/marker-layer';

describe('Marker', function() {
  let atomEnv, editor, markerID;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    editor = await atomEnv.workspace.open(__filename);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function setMarkerID(id) {
    markerID = id;
  }

  it('adds its marker on mount with default properties', function() {
    mount(
      <Marker editor={editor} bufferRange={Range.fromObject([[0, 0], [10, 0]])} handleID={setMarkerID} />,
    );

    const marker = editor.getMarker(markerID);
    assert.isTrue(marker.getBufferRange().isEqual([[0, 0], [10, 0]]));
    assert.strictEqual(marker.bufferMarker.invalidate, 'overlap');
    assert.isFalse(marker.isReversed());
  });

  it('configures its marker', function() {
    mount(
      <Marker
        editor={editor}
        handleID={setMarkerID}
        bufferRange={Range.fromObject([[1, 2], [4, 5]])}
        reversed={true}
        invalidate={'never'}
        exclusive={true}
      />,
    );

    const marker = editor.getMarker(markerID);
    assert.isTrue(marker.getBufferRange().isEqual([[1, 2], [4, 5]]));
    assert.isTrue(marker.isReversed());
    assert.strictEqual(marker.bufferMarker.invalidate, 'never');
  });

  it('prefers marking a MarkerLayer to a TextEditor', function() {
    const layer = editor.addMarkerLayer();

    mount(
      <Marker
        editor={editor}
        layer={layer}
        handleID={setMarkerID}
        bufferRange={Range.fromObject([[0, 0], [1, 0]])}
      />,
    );

    const marker = layer.getMarker(markerID);
    assert.strictEqual(marker.layer, layer);
  });

  it('destroys its marker on unmount', function() {
    const wrapper = mount(
      <Marker editor={editor} handleID={setMarkerID} bufferRange={Range.fromObject([[0, 0], [0, 0]])} />,
    );

    assert.isDefined(editor.getMarker(markerID));
    wrapper.unmount();
    assert.isUndefined(editor.getMarker(markerID));
  });

  it('marks an editor from a parent node', function() {
    const wrapper = mount(
      <AtomTextEditor>
        <Marker handleID={setMarkerID} bufferRange={Range.fromObject([[0, 0], [0, 0]])} />
      </AtomTextEditor>,
    );

    const theEditor = wrapper.instance().getModel();
    const marker = theEditor.getMarker(markerID);
    assert.isTrue(marker.getBufferRange().isEqual([[0, 0], [0, 0]]));
  });

  it('marks a marker layer from a parent node', function() {
    let layerID;
    const wrapper = mount(
      <AtomTextEditor>
        <MarkerLayer handleID={id => { layerID = id; }}>
          <Marker handleID={setMarkerID} bufferRange={Range.fromObject([[0, 0], [0, 0]])} />
        </MarkerLayer>
      </AtomTextEditor>,
    );

    const theEditor = wrapper.instance().getModel();
    const layer = theEditor.getMarkerLayer(layerID);
    const marker = layer.getMarker(markerID);
    assert.isTrue(marker.getBufferRange().isEqual([[0, 0], [0, 0]]));
  });
});
