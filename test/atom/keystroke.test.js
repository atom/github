import React from 'react';
import {shallow} from 'enzyme';

import Keystroke from '../../lib/atom/keystroke';

describe('Keystroke', function() {
  let atomEnv, keymaps, root, rootFn;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    keymaps = atomEnv.keymaps;

    root = document.createElement('div');
    root.className = 'github-KeystrokeTest';

    atomEnv.commands.add(root, 'keystroke-test:root', () => {});
    keymaps.add(__filename, {
      '.github-KeystrokeTest': {
        'ctrl-x': 'keystroke-test:root',
      },
    });
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('renders nothing for an unmapped command', function() {
    const wrapper = shallow(
      <Keystroke keymaps={keymaps} command="keystroke-test:unmapped" />,
    );

    assert.isFalse(wrapper.find('span.keystroke').exists());
  });

  it('renders a registered keystroke', function() {
    const wrapper = shallow(
      <Keystroke keymaps={keymaps} command="keystroke-test:root" target={root} />,
    );

    assert.strictEqual(wrapper.find('span.keystroke').text(), '\u2303X');
  });
});
