import path from 'path';
import fs from 'fs';
import React from 'react';
import {mount} from 'enzyme';

import FilePatchController from '../../lib/controllers/file-patch-controller';
import {cloneRepository, buildRepository} from '../helpers';

describe('FilePatchController', function() {
  let atomEnv, repository, filePatch;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), 'changed\n');

    filePatch = await repository.getFilePatchForPath('a.txt', {staged: false});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      repository,
      stagingStatus: 'unstaged',
      relPath: 'a.txt',
      isPartiallyStaged: false,
      filePatch,
      workspace: atomEnv.workspace,
      tooltips: atomEnv.tooltips,
      destroy: () => {},
      discardLines: () => {},
      undoLastDiscard: () => {},
      ...overrideProps,
    };

    return <FilePatchController {...props} />;
  }

  it('passes extra props to the FilePatchView', function() {
    const extra = Symbol('extra');
    const wrapper = mount(buildApp({extra}));

    assert.strictEqual(wrapper.find('FilePatchView').prop('extra'), extra);
  });
});
