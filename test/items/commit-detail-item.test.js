import React from 'react';
import {mount} from 'enzyme';

import CommitDetailItem from '../../lib/items/commit-detail-item';
import PaneItem from '../../lib/atom/pane-item';
import WorkdirContextPool from '../../lib/models/workdir-context-pool';
import {cloneRepository} from '../helpers';

describe.only('CommitDetailItem', function() {
  let atomEnv, repository, pool;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    const workdir = await cloneRepository('multiple-commits');

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
      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      keymaps: atomEnv.keymaps,
      tooltips: atomEnv.tooltips,
      config: atomEnv.config,
      discardLines: () => {},
      ...override,
    };

    return (
      <PaneItem workspace={atomEnv.workspace} uriPattern={CommitDetailItem.uriPattern}>
        {({itemHolder, params}) => {
          return (
            <CommitDetailItem
              ref={itemHolder.setter}
              workingDirectory={params.workingDirectory}
              sha={params.sha}
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
      sha: '18920c900bfa6e4844853e7e246607a31c3e2e8c',
      ...options,
    };
    const uri = CommitDetailItem.buildURI(opts.workingDirectory);
    return atomEnv.workspace.open(uri);
  }

  it('constructs and opens the correct URI', async function() {
    const wrapper = mount(buildPaneApp());
    await open(wrapper);

    assert.isTrue(wrapper.update().find('CommitDetailItem').exists());
  });

});
