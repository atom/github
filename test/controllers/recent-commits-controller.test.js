import React from 'react';
import {shallow} from 'enzyme';

import RecentCommitsController from '../../lib/controllers/recent-commits-controller';
import Commit from '../../lib/models/commit';
import {cloneRepository, buildRepository} from '../helpers';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('RecentCommitsController', function() {
  let app;

  beforeEach(function() {
    app = <RecentCommitsController commits={[]} undoLastCommit={() => {}} isLoading={false} />;
  });

  it('passes recent commits to the RecentCommitsView', function() {
    const commits = [new Commit('1'), new Commit('2'), new Commit('3')];
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
    let atomEnv, workdirPath, repository;

    beforeEach(async function() {
      atomEnv = global.buildAtomEnvironment();
      workdirPath = await cloneRepository();
      repository = await buildRepository(workdirPath);
    });

    afterEach(function() {
      atomEnv.destroy();
    });

    it('opens a commit detail item', function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();

      const sha = 'asdf1234';
      const commits = [new Commit({sha})];
      app = React.cloneElement(app, {commits, workspace: atomEnv.workspace, repository});
      const wrapper = shallow(app);
      wrapper.instance().openCommit({sha: 'asdf1234'});

      assert.isTrue(atomEnv.workspace.open.calledWith(
        `atom-github://commit-detail?workdir=${encodeURIComponent(workdirPath)}` +
        `&sha=${encodeURIComponent(sha)}`,
      ));
    });

    it('records an event', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();
      sinon.stub(reporterProxy, 'addEvent');

      const sha = 'asdf1234';
      const commits = [new Commit({sha})];
      app = React.cloneElement(app, {commits, workspace: atomEnv.workspace, repository});
      const wrapper = shallow(app);

      await wrapper.instance().openCommit({sha: 'asdf1234'});
      assert.isTrue(reporterProxy.addEvent.calledWith('open-commit-in-pane', {package: 'github', from: RecentCommitsController.name}));
    });
  });
});
