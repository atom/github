import React from 'react';
import {shallow, mount} from 'enzyme';

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

  describe('openCommit({sha, preserveFocus})', function() {
    it('opens a commit detail item', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();

      const sha = 'asdf1234';
      const commits = [commitBuilder().sha(sha).build()];
      app = React.cloneElement(app, {commits});

      const wrapper = shallow(app);
      await wrapper.find('RecentCommitsView').prop('openCommit')({sha: 'asdf1234', preserveFocus: false});

      assert.isTrue(atomEnv.workspace.open.calledWith(
        `atom-github://commit-detail?workdir=${encodeURIComponent(workdirPath)}` +
        `&sha=${encodeURIComponent(sha)}`,
      ));
    });

    it('preserves keyboard focus within the RecentCommitsView when requested', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();

      const sha = 'asdf1234';
      const commits = [commitBuilder().sha(sha).build()];
      app = React.cloneElement(app, {commits});

      const wrapper = mount(app);
      const focusSpy = sinon.stub(wrapper.find('RecentCommitsView').instance(), 'setFocus').returns(true);

      await wrapper.find('RecentCommitsView').prop('openCommit')({sha: 'asdf1234', preserveFocus: true});
      assert.isTrue(focusSpy.called);
    });

    it('records an event', async function() {
      sinon.stub(atomEnv.workspace, 'open').resolves();
      sinon.stub(reporterProxy, 'addEvent');

      const sha = 'asdf1234';
      const commits = [commitBuilder().sha(sha).build()];
      app = React.cloneElement(app, {commits});
      const wrapper = shallow(app);

      await wrapper.instance().openCommit({sha: 'asdf1234', preserveFocus: true});
      assert.isTrue(reporterProxy.addEvent.calledWith('open-commit-in-pane', {
        package: 'github',
        from: RecentCommitsController.name,
      }));
    });
  });

  describe('commit navigation', function() {
    let wrapper;

    beforeEach(function() {
      const commits = ['1', '2', '3', '4', '5'].map(s => commitBuilder().sha(s).build());
      app = React.cloneElement(app, {commits});
      wrapper = shallow(app);
    });

    describe('selectNextCommit', function() {
      it('selects the first commit if there is no selection', async function() {
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '');
        await wrapper.find('RecentCommitsView').prop('selectNextCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '1');
      });

      it('selects the next commit in sequence', async function() {
        wrapper.setState({selectedCommitSha: '2'});
        await wrapper.find('RecentCommitsView').prop('selectNextCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '3');
      });

      it('remains on the last commit', async function() {
        wrapper.setState({selectedCommitSha: '5'});
        await wrapper.find('RecentCommitsView').prop('selectNextCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '5');
      });
    });

    describe('selectPreviousCommit', function() {
      it('selects the first commit if there is no selection', async function() {
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '');
        await wrapper.find('RecentCommitsView').prop('selectPreviousCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '1');
      });

      it('selects the previous commit in sequence', async function() {
        wrapper.setState({selectedCommitSha: '3'});
        await wrapper.find('RecentCommitsView').prop('selectPreviousCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '2');
      });

      it('remains on the first commit', async function() {
        wrapper.setState({selectedCommitSha: '1'});
        await wrapper.find('RecentCommitsView').prop('selectPreviousCommit')();
        assert.strictEqual(wrapper.find('RecentCommitsView').prop('selectedCommitSha'), '1');
      });
    });
  });

  it('forwards focus management methods to its view', function() {
    const wrapper = mount(app);

    const setFocusSpy = sinon.spy(wrapper.find('RecentCommitsView').instance(), 'setFocus');
    const rememberFocusSpy = sinon.spy(wrapper.find('RecentCommitsView').instance(), 'rememberFocus');

    wrapper.instance().setFocus(RecentCommitsController.focus.RECENT_COMMIT);
    assert.isTrue(setFocusSpy.calledWith(RecentCommitsController.focus.RECENT_COMMIT));

    wrapper.instance().rememberFocus({target: null});
    assert.isTrue(rememberFocusSpy.calledWith({target: null}));
  });
});
