import React from 'react';
import {mount} from 'enzyme';

import CommitPreviewItem from '../../lib/items/commit-preview-item';
import PaneItem from '../../lib/atom/pane-item';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';
import {cloneRepository} from '../helpers';

describe('CommitPreviewItem', function() {
  let atomEnv, repository, pool;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    const workdir = await cloneRepository();

    pool = new WorkdirContextPool({
      workspace: atomEnv.workspace,
    });

    repository = pool.add(workdir).getRepository();
  });

  afterEach(function() {
    atomEnv.destroy();
    pool.clear();
  });

  function buildPaneApp(override = {}) {
    const props = {
      workdirContextPool: pool,
      ...override,
    };

    return (
      <PaneItem workspace={atomEnv.workspace} uriPattern={CommitPreviewItem.uriPattern}>
        {({itemHolder, params}) => {
          return (
            <CommitPreviewItem
              ref={itemHolder.setter}
              workingDirectory={params.workingDirectory}
              {...props}
            />
          );
        }}
      </PaneItem>
    );
  }

  function open(wrapper, options = {}) {
    const opts = {
      workingDirectory: repository.getWorkingDirectoryPath(),
      ...options,
    };
    const uri = CommitPreviewItem.buildURI(opts.workingDirectory);
    return atomEnv.workspace.open(uri);
  }

  it('constructs and opens the correct URI', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper);

    assert.isTrue(wrapper.update().find('CommitPreviewItem').exists());
  });

  it('passes extra props to its container', async function() {
    const extra = Symbol('extra');
    const wrapper = mount(buildPaneApp({extra}));
    await open(wrapper);

    assert.strictEqual(wrapper.update().find('CommitPreviewContainer').prop('extra'), extra);
  });

  it('locates the repository from the context pool', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper);

    assert.strictEqual(wrapper.update().find('CommitPreviewContainer').prop('repository'), repository);
  });

  it('passes an absent repository if the working directory is unrecognized', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper, {workingDirectory: '/nah'});

    assert.isTrue(wrapper.update().find('CommitPreviewContainer').prop('repository').isAbsent());
  });

  it('returns a fixed title and icon', async function() {
    const wrapper = mount(buildPaneApp());
    const item = await open(wrapper);

    assert.strictEqual(item.getTitle(), 'Commit preview');
    assert.strictEqual(item.getIconName(), 'git-commit');
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
});
