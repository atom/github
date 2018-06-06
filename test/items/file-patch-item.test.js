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
      tooltips: atomEnv.tooltips,
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
});
