import React from 'react';
import {shallow} from 'enzyme';
import {TextBuffer} from 'atom';

import DirectorySelect from '../../lib/views/directory-select';

describe('DirectorySelect', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const buffer = new TextBuffer();

    return (
      <DirectorySelect
        buffer={buffer}
        showOpenDialog={() => {}}
        {...override}
      />
    );
  }

  it('renders an editor for the destination path', function() {
    const buffer = new TextBuffer();
    const wrapper = shallow(buildApp({buffer}));

    assert.strictEqual(wrapper.find('AtomTextEditor.github-DirectorySelect-destinationPath').prop('buffer'), buffer);
  });

  describe('clicking the directory button', function() {
    it('populates the destination path buffer on accept', async function() {
      const showOpenDialog = sinon.stub().callsArgWith(2, ['/some/directory/path']);
      const buffer = new TextBuffer({text: '/original'});

      const wrapper = shallow(buildApp({showOpenDialog, buffer}));

      await wrapper.find('.btn.icon-file-directory').prop('onClick')();

      assert.strictEqual(buffer.getText(), '/some/directory/path');
    });

    it('leaves the destination path buffer unmodified on cancel', async function() {
      const showOpenDialog = sinon.stub().callsArgWith(2, undefined);
      const buffer = new TextBuffer({text: '/original'});

      const wrapper = shallow(buildApp({showOpenDialog, buffer}));

      await wrapper.find('.btn.icon-file-directory').prop('onClick')();

      assert.strictEqual(buffer.getText(), '/original');
    });
  });
});
