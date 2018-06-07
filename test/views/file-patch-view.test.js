import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import FilePatchView from '../../lib/views/file-patch-view';

describe('FilePatchView', function() {
  let atomEnv, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    const repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), 'changed\n');
    filePatch = await repository.getFilePatchForPath('a.txt', {staged: false});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      stagingStatus: 'unstaged',
      isPartiallyStaged: false,
      filePatch,
      tooltips: atomEnv.tooltips,
      ...overrideProps,
    };

    return <FilePatchView {...props} />;
  }

  it('renders the file header', function() {
    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('FilePatchHeader').exists());
  });

  it('renders the file patch within an editor', function() {
    const wrapper = mount(buildApp());

    const editor = wrapper.find('AtomTextEditor');
    assert.strictEqual(editor.instance().getModel().getText(), filePatch.present().getText());
  });

  it('renders a header for each hunk');

  describe('hunk lines', function() {
    it('decorates added lines');

    it('decorates deleted lines');

    it('decorates the nonewlines line');
  });
});
