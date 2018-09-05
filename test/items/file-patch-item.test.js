import path from 'path';
import React from 'react';
import {mount} from 'enzyme';

import PaneItem from '../../lib/atom/pane-item';
import FilePatchItem from '../../lib/items/file-patch-item';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';
import {cloneRepository} from '../helpers';

describe('FilePatchItem', function() {
  let atomEnv, repository, pool;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    const workdirPath = await cloneRepository();

    pool = new WorkdirContextPool({
      workspace: atomEnv.workspace,
    });
    repository = pool.add(workdirPath).getRepository();
  });

  afterEach(function() {
    atomEnv.destroy();
    pool.clear();
  });

  function buildPaneApp(overrideProps = {}) {
    const props = {
      workdirContextPool: pool,
      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      tooltips: atomEnv.tooltips,
      discardLines: () => {},
      undoLastDiscard: () => {},
      ...overrideProps,
    };

    return (
      <PaneItem workspace={atomEnv.workspace} uriPattern={FilePatchItem.uriPattern}>
        {({itemHolder, params}) => {
          return (
            <FilePatchItem
              ref={itemHolder.setter}
              workingDirectory={params.workingDirectory}
              relPath={path.join(...params.relPath)}
              stagingStatus={params.stagingStatus}
              {...props}
            />
          );
        }}
      </PaneItem>
    );
  }

  function open(wrapper, options = {}) {
    const opts = {
      relPath: 'a.txt',
      workingDirectory: repository.getWorkingDirectoryPath(),
      stagingStatus: 'unstaged',
      ...options,
    };
    const uri = FilePatchItem.buildURI(opts.relPath, opts.workingDirectory, opts.stagingStatus);
    return atomEnv.workspace.open(uri);
  }

  it('locates the repository from the context pool', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper);

    assert.strictEqual(wrapper.update().find('FilePatchContainer').prop('repository'), repository);
  });

  it('passes an absent repository if the working directory is unrecognized', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper, {workingDirectory: '/nope'});

    assert.isTrue(wrapper.update().find('FilePatchContainer').prop('repository').isAbsent());
  });

  it('passes other props to the container', async function() {
    const other = Symbol('other');
    const wrapper = mount(buildPaneApp({other}));
    await open(wrapper);

    assert.strictEqual(wrapper.update().find('FilePatchContainer').prop('other'), other);
  });

  describe('getTitle()', function() {
    it('renders an unstaged title', async function() {
      const wrapper = mount(buildPaneApp());
      const item = await open(wrapper, {stagingStatus: 'unstaged'});

      assert.strictEqual(item.getTitle(), 'Unstaged Changes: a.txt');
    });

    it('renders a staged title', async function() {
      const wrapper = mount(buildPaneApp());
      const item = await open(wrapper, {stagingStatus: 'staged'});

      assert.strictEqual(item.getTitle(), 'Staged Changes: a.txt');
    });
  });

  it('terminates pending state', async function() {
    const wrapper = mount(buildPaneApp());

    const item = await open(wrapper);
    const callback = sinon.spy();
    const sub = item.onDidTerminatePendingState(callback);

    assert.strictEqual(callback.callCount, 0);
    item.terminatePendingState();
    assert.strictEqual(callback.callCount, 1);
    item.terminatePendingState();
    assert.strictEqual(callback.callCount, 1);

    sub.dispose();
  });

  it('may be destroyed once', async function() {
    const wrapper = mount(buildPaneApp());

    const item = await open(wrapper);
    const callback = sinon.spy();
    const sub = item.onDidDestroy(callback);

    assert.strictEqual(callback.callCount, 0);
    item.destroy();
    assert.strictEqual(callback.callCount, 1);

    sub.dispose();
  });

  it('serializes itself as a FilePatchControllerStub', async function() {
    const wrapper = mount(buildPaneApp());
    const item0 = await open(wrapper, {relPath: 'a.txt', workingDirectory: '/dir0', stagingStatus: 'unstaged'});
    assert.deepEqual(item0.serialize(), {
      deserializer: 'FilePatchControllerStub',
      uri: 'atom-github://file-patch/a.txt?workdir=%2Fdir0&stagingStatus=unstaged',
    });

    const item1 = await open(wrapper, {relPath: 'b.txt', workingDirectory: '/dir1', stagingStatus: 'staged'});
    assert.deepEqual(item1.serialize(), {
      deserializer: 'FilePatchControllerStub',
      uri: 'atom-github://file-patch/b.txt?workdir=%2Fdir1&stagingStatus=staged',
    });
  });

  it('has some item-level accessors', async function() {
    const wrapper = mount(buildPaneApp());
    const item = await open(wrapper, {relPath: 'a.txt', workingDirectory: '/dir', stagingStatus: 'unstaged'});

    assert.strictEqual(item.getStagingStatus(), 'unstaged');
    assert.strictEqual(item.getFilePath(), 'a.txt');
    assert.strictEqual(item.getWorkingDirectory(), '/dir');
    assert.isTrue(item.isFilePatchItem());
  });
});
