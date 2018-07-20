import React from 'react';
import {shallow} from 'enzyme';

import {gitHubTabControllerProps} from '../fixtures/props/github-tab-props';
import GitHubTabController from '../../lib/controllers/github-tab-controller';
import Repository from '../../lib/models/repository';
import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import RemoteSet from '../../lib/models/remote-set';
import Remote from '../../lib/models/remote';

describe('GitHubTabController', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = {
      repository: Repository.absent(),
      ...overrideProps,
    };

    return <GitHubTabController {...gitHubTabControllerProps(atomEnv, props.repository, props)} />;
  }

  describe('derived view props', function() {
    const dotcom0 = new Remote('yes0', 'git@github.com:aaa/bbb.git');
    const dotcom1 = new Remote('yes1', 'https://github.com/ccc/ddd.git');
    const nonDotcom = new Remote('no0', 'git@sourceforge.net:eee/fff.git');

    it('passes the current branch', function() {
      const currentBranch = new Branch('aaa', nullBranch, nullBranch, true);
      const otherBranch = new Branch('bbb');
      const branches = new BranchSet([currentBranch, otherBranch]);
      const wrapper = shallow(buildApp({branches}));

      assert.strictEqual(wrapper.find('GitHubTabView').prop('currentBranch'), currentBranch);
    });

    it('passes remotes hosted on GitHub', function() {
      const allRemotes = new RemoteSet([dotcom0, dotcom1, nonDotcom]);
      const wrapper = shallow(buildApp({allRemotes}));

      const passed = wrapper.find('GitHubTabView').prop('remotes');
      assert.isTrue(passed.withName('yes0').isPresent());
      assert.isTrue(passed.withName('yes1').isPresent());
      assert.isFalse(passed.withName('no0').isPresent());
    });

    it('detects an explicitly specified current remote', function() {
      const allRemotes = new RemoteSet([dotcom0, dotcom1, nonDotcom]);
      const wrapper = shallow(buildApp({allRemotes, selectedRemoteName: 'yes1'}));
      assert.strictEqual(wrapper.find('GitHubTabView').prop('currentRemote'), dotcom1);
      assert.isFalse(wrapper.find('GitHubTabView').prop('manyRemotesAvailable'));
    });

    it('uses a single GitHub-hosted remote', function() {
      const allRemotes = new RemoteSet([dotcom0, nonDotcom]);
      const wrapper = shallow(buildApp({allRemotes}));
      assert.strictEqual(wrapper.find('GitHubTabView').prop('currentRemote'), dotcom0);
      assert.isFalse(wrapper.find('GitHubTabView').prop('manyRemotesAvailable'));
    });

    it('indicates when multiple remotes are available', function() {
      const allRemotes = new RemoteSet([dotcom0, dotcom1]);
      const wrapper = shallow(buildApp({allRemotes}));
      assert.isFalse(wrapper.find('GitHubTabView').prop('currentRemote').isPresent());
      assert.isTrue(wrapper.find('GitHubTabView').prop('manyRemotesAvailable'));
    });
  });

  describe('actions', function() {
    it('pushes a branch', async function() {
      const repository = Repository.absent();
      sinon.stub(repository, 'push').resolves(true);
      const wrapper = shallow(buildApp({repository}));

      const branch = new Branch('abc');
      const remote = new Remote('def', 'git@github.com:def/ghi.git');
      assert.isTrue(await wrapper.find('GitHubTabView').prop('handlePushBranch')(branch, remote));

      assert.isTrue(repository.push.calledWith('abc', {remote, setUpstream: true}));
    });

    it('chooses a remote', async function() {
      const repository = Repository.absent();
      sinon.stub(repository, 'setConfig').resolves(true);
      const wrapper = shallow(buildApp({repository}));

      const remote = new Remote('aaa', 'git@github.com:aaa/aaa.git');
      const event = {preventDefault: sinon.spy()};
      assert.isTrue(await wrapper.find('GitHubTabView').prop('handleRemoteSelect')(event, remote));

      assert.isTrue(event.preventDefault.called);
      assert.isTrue(repository.setConfig.calledWith('atomGithub.currentRemote', 'aaa'));
    });
  });
});
