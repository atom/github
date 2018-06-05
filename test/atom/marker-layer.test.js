import React from 'react';
import {shallow, mount} from 'enzyme';

import MarkerLayer from '../../lib/atom/marker-layer';
import AtomTextEditor from '../../lib/atom/atom-text-editor';

describe('MarkerLayer', function() {
  let atomEnv, editor;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    editor = await atomEnv.workspace.open(__filename);
  });

  it('adds its layer on mount', function() {
    const app = (
      <MarkerLayer
        editor={editor}
        maintainHistory={true}
        persistent={true}
      />
    );
    const wrapper = shallow(app);
    const id = wrapper.instance().getID();

    const layer = editor.getMarkerLayer(id);
    assert.isTrue(layer.bufferMarkerLayer.maintainHistory);
    assert.isTrue(layer.bufferMarkerLayer.persistent);
  });

  it('removes its layer on unmount', function() {
    const app = <MarkerLayer editor={editor} />;
    const wrapper = shallow(app);
    const id = wrapper.instance().getID();

    assert.isDefined(editor.getMarkerLayer(id));
    wrapper.unmount();
    assert.isUndefined(editor.getMarkerLayer(id));
  });

  it('inherits an editor from a parent node', function() {
    const app = (
      <AtomTextEditor>
        <MarkerLayer />
      </AtomTextEditor>
    );
    const wrapper = mount(app);
    const theEditor = wrapper.instance().getModel();
    const id = wrapper.find('MarkerLayer').instance().getID();

    assert.isDefined(theEditor.getMarkerLayer(id));
  });
});
