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
});
