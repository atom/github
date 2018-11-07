import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {mount} from 'enzyme';

import ChangedFileContainer from '../../lib/containers/changed-file-container';
import {cloneRepository, buildRepository} from '../helpers';

describe('ChangedFileContainer', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), 'changed\n');

    // b.txt: staged changes
    await fs.writeFile(path.join(workdirPath, 'b.txt'), 'changed\n');
    await repository.stageFiles(['b.txt']);

    // c.txt: untouched
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      repository,
      stagingStatus: 'unstaged',
      relPath: 'a.txt',
      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      keymaps: atomEnv.keymaps,
      tooltips: atomEnv.tooltips,
      config: atomEnv.config,
      discardLines: () => {},
      undoLastDiscard: () => {},
      surfaceFileAtPath: () => {},
      destroy: () => {},
      ...overrideProps,
    };

    return <ChangedFileContainer {...props} />;
  }

  it('renders a loading spinner before file patch data arrives', function() {
    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it('renders a MultiFilePatchController', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('MultiFilePatchController').exists());
  });

  it('adopts the buffer from the previous FilePatch when a new one arrives', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('MultiFilePatchController').exists());

    const prevPatch = wrapper.find('MultiFilePatchController').prop('multiFilePatch');
    const prevBuffer = prevPatch.getBuffer();

    await fs.writeFile(path.join(repository.getWorkingDirectoryPath(), 'a.txt'), 'changed\nagain\n');
    repository.refresh();

    await assert.async.notStrictEqual(wrapper.update().find('MultiFilePatchController').prop('multiFilePatch'), prevPatch);

    const nextBuffer = wrapper.find('MultiFilePatchController').prop('multiFilePatch').getBuffer();
    assert.strictEqual(nextBuffer, prevBuffer);
  });

  it('does not adopt a buffer from an unchanged patch', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('MultiFilePatchController').exists());

    const prevPatch = wrapper.find('MultiFilePatchController').prop('multiFilePatch');
    sinon.spy(prevPatch, 'adoptBufferFrom');

    wrapper.setProps({});

    assert.isFalse(prevPatch.adoptBufferFrom.called);

    const nextPatch = wrapper.find('MultiFilePatchController').prop('multiFilePatch');
    assert.strictEqual(nextPatch, prevPatch);
  });

  it('passes unrecognized props to the FilePatchView', async function() {
    const extra = Symbol('extra');
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged', extra}));
    await assert.async.strictEqual(wrapper.update().find('MultiFilePatchView').prop('extra'), extra);
  });
});
