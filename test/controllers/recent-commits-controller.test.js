import React from 'react';
import {shallow} from 'enzyme';

import RecentCommitsController from '../../lib/controllers/recent-commits-controller';
import {commitBuilder} from '../builder/commit';
import {cloneRepository, buildRepository} from '../helpers';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('RecentCommitsController', function() {
  let atomEnv, workdirPath, app;

  beforeEach(async function() {
    workdirPath = await cloneRepository('three-files');
    const repository = await buildRepository(workdirPath);

    atomEnv = global.buildAtomEnvironment();

    app = (
      <RecentCommitsController
        commits={[]}
        isLoading={false}
        undoLastCommit={() => { }}
        workspace={atomEnv.workspace}
        commandRegistry={atomEnv.commands}
        repository={repository}
      />
    );
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('passes recent commits to the RecentCommitsView', function() {
    const commits = [commitBuilder().build(), commitBuilder().build(), commitBuilder().build()];
    app = React.cloneElement(app, {commits});
    const wrapper = shallow(app);
    assert.deepEqual(wrapper.find('RecentCommitsView').prop('commits'), commits);
  });

  it('passes fetch progress to the RecentCommitsView', function() {
    app = React.cloneElement(app, {isLoading: true});
    const wrapper = shallow(app);
    assert.isTrue(wrapper.find('RecentCommitsView').prop('isLoading'));
  });

  describe('openCommit({sha})', function() {
    it('opens a commit detail item', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();

      const sha = 'asdf1234';
      const commits = [commitBuilder().sha(sha).build()];
      app = React.cloneElement(app, {commits});

      const wrapper = shallow(app);
      await wrapper.find('RecentCommitsView').prop('openCommit')({sha: 'asdf1234'});

      assert.isTrue(atomEnv.workspace.open.calledWith(
        `atom-github://commit-detail?workdir=${encodeURIComponent(workdirPath)}` +
        `&sha=${encodeURIComponent(sha)}`,
      ));
    });

    it('records an event', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();
      sinon.stub(reporterProxy, 'addEvent');

      const sha = 'asdf1234';
      const commits = [commitBuilder().sha(sha).build()];
      app = React.cloneElement(app, {commits});
      const wrapper = shallow(app);

      await wrapper.instance().openCommit({sha: 'asdf1234'});
      assert.isTrue(reporterProxy.addEvent.calledWith('open-commit-in-pane', {
        package: 'github',
        from: RecentCommitsController.name,
      }));
    });
  });
});
