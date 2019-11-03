import React from 'react';
import {mount} from 'enzyme';

import {cloneRepository} from '../helpers';
import GitHubTabContainer from '../../lib/containers/github-tab-container';
import Repository from '../../lib/models/repository';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../lib/models/github-login-model';
import RefHolder from '../../lib/models/ref-holder';

describe('GitHubTabContainer', function() {
  let atomEnv, repository;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    repository = Repository.absent();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(props = {}) {
    return (
      <GitHubTabContainer
        workspace={atomEnv.workspace}
        repository={repository}
        loginModel={new GithubLoginModel(InMemoryStrategy)}
        rootHolder={new RefHolder()}

        changeWorkingDirectory={() => {}}
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

  describe('operation state observer', function() {
    it('creates an observer on the current repository', function() {
      const wrapper = mount(buildApp());

      const observer = wrapper.state('remoteOperationObserver');
      assert.strictEqual(observer.repository, repository);

      wrapper.setProps({});
      assert.strictEqual(wrapper.state('remoteOperationObserver'), observer);
    });

    it('creates a new observer when the repository changes', function() {
      const repository0 = Repository.absent();
      const wrapper = mount(buildApp({repository: repository0}));

      const observer0 = wrapper.state('remoteOperationObserver');

      const repository1 = Repository.absent();
      wrapper.setProps({repository: repository1});
      assert.notStrictEqual(wrapper.state('remoteOperationObserver'), observer0);
    });
  });

  describe('while loading', function() {
    it('passes isLoading to its view', async function() {
      const loadingRepo = new Repository(await cloneRepository());
      assert.isTrue(loadingRepo.isLoading());
      const wrapper = mount(buildApp({repository: loadingRepo}));

      assert.isTrue(wrapper.find('GitHubTabController').prop('isLoading'));
    });
  });

  describe('once loaded', function() {
    it('renders the controller', async function() {
      const workdir = await cloneRepository();
      const presentRepo = new Repository(workdir);
      await presentRepo.getLoadPromise();
      const wrapper = mount(buildApp({repository: presentRepo}));

      await assert.async.isFalse(wrapper.update().find('GitHubTabController').prop('isLoading'));
      assert.strictEqual(wrapper.find('GitHubTabController').prop('workingDirectory'), workdir);
    });
  });
});
