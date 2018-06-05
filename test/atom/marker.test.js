import React from 'react';
import {mount} from 'enzyme';

import Marker from '../../lib/atom/marker';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

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
      <Marker editor={editor} bufferRange={[[0, 0], [10, 0]]} handleID={setMarkerID} />,
    );

    const marker = editor.getMarker(markerID);
    assert.isTrue(marker.getBufferRange().isEqual([[0, 0], [10, 0]]));
    assert.strictEqual(marker.bufferMarker.invalidate, 'overlap');
    assert.isFalse(marker.isReversed());
    assert.isFalse(marker.bufferMarker.layer.maintainHistory);
  });

  it('configures its marker');

  it('prefers marking a MarkerLayer to a TextEditor');

  it('removes its layer on unmount');

  it('marks an editor from a parent node');

  it('marks a marker layer from a parent node');
});
