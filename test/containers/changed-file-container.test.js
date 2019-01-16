import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import {mount} from 'enzyme';

import ChangedFileContainer from '../../lib/containers/changed-file-container';
import ChangedFileItem from '../../lib/items/changed-file-item';
import {TOO_LARGE, EXPANDED} from '../../lib/models/patch/patch';
import {cloneRepository, buildRepository} from '../helpers';

describe('ChangedFileContainer', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();
    repository = await buildRepository(workdirPath);

    // a.txt: unstaged changes
    await fs.writeFile(path.join(workdirPath, 'a.txt'), '0\n1\n2\n3\n4\n5\n');

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
      itemType: ChangedFileItem,

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

  it('renders a ChangedFileController', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('ChangedFileController').exists());
  });

  it('adopts the buffer from the previous FilePatch when a new one arrives', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('ChangedFileController').exists());

    const prevPatch = wrapper.find('ChangedFileController').prop('multiFilePatch');
    const prevBuffer = prevPatch.getBuffer();

    await fs.writeFile(path.join(repository.getWorkingDirectoryPath(), 'a.txt'), 'changed\nagain\n');
    repository.refresh();

    await assert.async.notStrictEqual(wrapper.update().find('ChangedFileController').prop('multiFilePatch'), prevPatch);

    const nextBuffer = wrapper.find('ChangedFileController').prop('multiFilePatch').getBuffer();
    assert.strictEqual(nextBuffer, prevBuffer);
  });

  it('does not adopt a buffer from an unchanged patch', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged'}));
    await assert.async.isTrue(wrapper.update().find('ChangedFileController').exists());

    const prevPatch = wrapper.find('ChangedFileController').prop('multiFilePatch');
    sinon.spy(prevPatch, 'adoptBufferFrom');

    wrapper.setProps({});

    assert.isFalse(prevPatch.adoptBufferFrom.called);

    const nextPatch = wrapper.find('ChangedFileController').prop('multiFilePatch');
    assert.strictEqual(nextPatch, prevPatch);
  });

  it('passes unrecognized props to the FilePatchView', async function() {
    const extra = Symbol('extra');
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged', extra}));
    await assert.async.strictEqual(wrapper.update().find('MultiFilePatchView').prop('extra'), extra);
  });

  it('remembers previously expanded large FilePatches', async function() {
    const wrapper = mount(buildApp({relPath: 'a.txt', stagingStatus: 'unstaged', largeDiffThreshold: 2}));

    await assert.async.isTrue(wrapper.update().exists('ChangedFileController'));
    const before = wrapper.find('ChangedFileController').prop('multiFilePatch');
    assert.strictEqual(before.getFilePatches()[0].getRenderStatus(), TOO_LARGE);

    before.getFilePatches()[0].triggerDelayedRender();
    assert.strictEqual(before.getFilePatches()[0].getRenderStatus(), EXPANDED);

    repository.refresh();
    await assert.async.notStrictEqual(wrapper.update().find('ChangedFileController').prop('multiFilePatch'), before);

    const after = wrapper.find('ChangedFileController').prop('multiFilePatch');
    assert.notStrictEqual(after, before);
    assert.strictEqual(after.getFilePatches()[0].getRenderStatus(), EXPANDED);
  });
});
