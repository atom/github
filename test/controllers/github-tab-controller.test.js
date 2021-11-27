import React from 'react';
import {shallow} from 'enzyme';

import GitHubTabController from '../../lib/controllers/github-tab-controller';
import Repository from '../../lib/models/repository';
import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import RemoteSet from '../../lib/models/remote-set';
import Remote, {nullRemote} from '../../lib/models/remote';
import {DOTCOM} from '../../lib/models/endpoint';
import {InMemoryStrategy, UNAUTHENTICATED} from '../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../lib/models/github-login-model';
import RefHolder from '../../lib/models/ref-holder';
import Refresher from '../../lib/models/refresher';
import * as reporterProxy from '../../lib/reporter-proxy';

import {buildRepository, cloneRepository} from '../helpers';

describe('GitHubTabController', function() {
  let atomEnv, repository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    repository = await buildRepository(await cloneRepository());
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(props = {}) {
    const repo = props.repository || repository;

    return (
      <GitHubTabController
        workspace={atomEnv.workspace}
        refresher={new Refresher()}
        loginModel={new GithubLoginModel(InMemoryStrategy)}
        token="1234"
        rootHolder={new RefHolder()}

        workingDirectory={repo.getWorkingDirectoryPath()}
        repository={repo}
        allRemotes={new RemoteSet()}
        githubRemotes={new RemoteSet()}
        currentRemote={nullRemote}
        branches={new BranchSet()}
        currentBranch={nullBranch}
        aheadCount={0}
        manyRemotesAvailable={false}
        pushInProgress={false}
        isLoading={false}
        currentWorkDir={repo.getWorkingDirectoryPath()}

        changeWorkingDirectory={() => {}}
        setContextLock={() => {}}
        contextLocked={false}
        onDidChangeWorkDirs={() => {}}
        getCurrentWorkDirs={() => []}
        openCreateDialog={() => {}}
        openPublishDialog={() => {}}
        openCloneDialog={() => {}}
        openGitTab={() => {}}

        {...props}
      />
    );
  }

  describe('derived view props', function() {
    it('passes the endpoint from the current GitHub remote when one exists', function() {
      const remote = new Remote('hub', 'git@github.com:some/repo.git');
      const wrapper = shallow(buildApp({currentRemote: remote}));
      assert.strictEqual(wrapper.find('GitHubTabView').prop('endpoint'), remote.getEndpoint());
    });

    it('defaults the endpoint to dotcom', function() {
      const wrapper = shallow(buildApp({currentRemote: nullRemote}));
      assert.strictEqual(wrapper.find('GitHubTabView').prop('endpoint'), DOTCOM);
    });
  });

  describe('actions', function() {
    it('pushes a branch', async function() {
      const absent = Repository.absent();
      sinon.stub(absent, 'push').resolves(true);
      const wrapper = shallow(buildApp({repository: absent}));

      const branch = new Branch('abc');
      const remote = new Remote('def', 'git@github.com:def/ghi.git');
      assert.isTrue(await wrapper.find('GitHubTabView').prop('handlePushBranch')(branch, remote));

      assert.isTrue(absent.push.calledWith('abc', {remote, setUpstream: true}));
    });

    it('chooses a remote', async function() {
      const absent = Repository.absent();
      sinon.stub(absent, 'setConfig').resolves(true);
      const wrapper = shallow(buildApp({repository: absent}));

      const remote = new Remote('aaa', 'git@github.com:aaa/aaa.git');
      const event = {preventDefault: sinon.spy()};
      assert.isTrue(await wrapper.find('GitHubTabView').prop('handleRemoteSelect')(event, remote));

      assert.isTrue(event.preventDefault.called);
      assert.isTrue(absent.setConfig.calledWith('atomGithub.currentRemote', 'aaa'));
    });

    it('opens the publish dialog on the active repository', async function() {
      const someRepo = await buildRepository(await cloneRepository());
      const openPublishDialog = sinon.spy();
      const wrapper = shallow(buildApp({repository: someRepo, openPublishDialog}));

      wrapper.find('GitHubTabView').prop('openBoundPublishDialog')();
      assert.isTrue(openPublishDialog.calledWith(someRepo));
    });

    it('handles and instruments a login', async function() {
      sinon.stub(reporterProxy, 'incrementCounter');
      const loginModel = new GithubLoginModel(InMemoryStrategy);

      const wrapper = shallow(buildApp({loginModel}));
      await wrapper.find('GitHubTabView').prop('handleLogin')('good-token');
      assert.strictEqual(await loginModel.getToken(DOTCOM.getLoginAccount()), 'good-token');
      assert.isTrue(reporterProxy.incrementCounter.calledWith('github-login'));
    });

    it('handles and instruments a logout', async function() {
      sinon.stub(reporterProxy, 'incrementCounter');
      const loginModel = new GithubLoginModel(InMemoryStrategy);
      await loginModel.setToken(DOTCOM.getLoginAccount(), 'good-token');

      const wrapper = shallow(buildApp({loginModel}));
      await wrapper.find('GitHubTabView').prop('handleLogout')();
      assert.strictEqual(await loginModel.getToken(DOTCOM.getLoginAccount()), UNAUTHENTICATED);
      assert.isTrue(reporterProxy.incrementCounter.calledWith('github-logout'));
    });
  });
});
