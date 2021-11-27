import React from 'react';
import {shallow} from 'enzyme';

import {buildRepository, cloneRepository} from '../helpers';
import GitHubTabContainer from '../../lib/containers/github-tab-container';
import GitHubTabController from '../../lib/controllers/github-tab-controller';
import Repository from '../../lib/models/repository';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../lib/models/github-login-model';
import Remote from '../../lib/models/remote';
import RemoteSet from '../../lib/models/remote-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import RefHolder from '../../lib/models/ref-holder';

describe('GitHubTabContainer', function() {
  let atomEnv, repository, defaultRepositoryData;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    repository = await buildRepository(await cloneRepository());

    defaultRepositoryData = {
      workingDirectory: repository.getWorkingDirectoryPath(),
      allRemotes: await repository.getRemotes(),
      branches: await repository.getBranches(),
      selectedRemoteName: 'origin',
      aheadCount: 0,
      pushInProgress: false,
    };
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
        contextLocked={false}

        changeWorkingDirectory={() => {}}
        onDidChangeWorkDirs={() => {}}
        getCurrentWorkDirs={() => []}
        openCreateDialog={() => {}}
        openPublishDialog={() => {}}
        openCloneDialog={() => {}}
        openGitTab={() => {}}
        setContextLock={() => {}}

        {...props}
      />
    );
  }

  describe('refresher', function() {
    let wrapper, retry;

    function stubRepository(repo) {
      sinon.stub(repo.getOperationStates(), 'isFetchInProgress').returns(false);
      sinon.stub(repo.getOperationStates(), 'isPushInProgress').returns(false);
      sinon.stub(repo.getOperationStates(), 'isPullInProgress').returns(false);
    }

    function simulateOperation(repo, name, middle = () => {}) {
      const accessor = `is${name[0].toUpperCase()}${name.slice(1)}InProgress`;
      const methodStub = repo.getOperationStates()[accessor];
      methodStub.returns(true);
      repo.state.didUpdate();
      middle();
      methodStub.returns(false);
      repo.state.didUpdate();
    }

    beforeEach(function() {
      wrapper = shallow(buildApp());
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(defaultRepositoryData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');

      retry = sinon.spy();
      const refresher = tokenWrapper.find(GitHubTabController).prop('refresher');
      refresher.setRetryCallback(Symbol('key'), retry);

      stubRepository(repository);
    });

    it('triggers a refresh when the current repository completes a fetch, push, or pull', function() {
      assert.isFalse(retry.called);

      simulateOperation(repository, 'fetch', () => assert.isFalse(retry.called));
      assert.strictEqual(retry.callCount, 1);

      simulateOperation(repository, 'push', () => assert.strictEqual(retry.callCount, 1));
      assert.strictEqual(retry.callCount, 2);

      simulateOperation(repository, 'pull', () => assert.strictEqual(retry.callCount, 2));
      assert.strictEqual(retry.callCount, 3);
    });

    it('un-observes an old repository and observes a new one', async function() {
      const other = await buildRepository(await cloneRepository());
      stubRepository(other);
      wrapper.setProps({repository: other});

      simulateOperation(repository, 'fetch');
      assert.isFalse(retry.called);

      simulateOperation(other, 'fetch');
      assert.isTrue(retry.called);
    });

    it('preserves the observer when the repository is unchanged', function() {
      wrapper.setProps({});

      simulateOperation(repository, 'fetch');
      assert.isTrue(retry.called);
    });

    it('un-observes the repository when unmounting', function() {
      wrapper.unmount();

      simulateOperation(repository, 'fetch');
      assert.isFalse(retry.called);
    });
  });

  describe('before loading', function() {
    it('passes isLoading to the controller', async function() {
      const loadingRepo = new Repository(await cloneRepository());
      const wrapper = shallow(buildApp({repository: loadingRepo}));
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(null);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');

      assert.isTrue(tokenWrapper.find('GitHubTabController').prop('isLoading'));
    });
  });

  describe('while loading', function() {
    it('passes isLoading to the controller', async function() {
      const loadingRepo = new Repository(await cloneRepository());
      assert.isTrue(loadingRepo.isLoading());
      const wrapper = shallow(buildApp({repository: loadingRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadingRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');

      assert.isTrue(tokenWrapper.find('GitHubTabController').prop('isLoading'));
    });
  });

  describe('when absent', function() {
    it('passes placeholder data to the controller', async function() {
      const absent = Repository.absent();
      const wrapper = shallow(buildApp({repository: absent}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(absent);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const controller = tokenWrapper.find('GitHubTabController');

      assert.strictEqual(controller.prop('allRemotes').size(), 0);
      assert.strictEqual(controller.prop('githubRemotes').size(), 0);
      assert.isFalse(controller.prop('currentRemote').isPresent());
      assert.strictEqual(controller.prop('branches').getNames().length, 0);
      assert.isFalse(controller.prop('currentBranch').isPresent());
      assert.strictEqual(controller.prop('aheadCount'), 0);
      assert.isFalse(controller.prop('manyRemotesAvailable'));
      assert.isFalse(controller.prop('pushInProgress'));
      assert.isFalse(controller.prop('isLoading'));
    });
  });

  describe('once loaded', function() {
    let nonGitHub, github0, github1;
    let loadedRepo, singleGitHubRemoteSet, multiGitHubRemoteSet;
    let otherBranch, mainBranch;
    let branches;

    beforeEach(async function() {
      loadedRepo = new Repository(await cloneRepository());
      await loadedRepo.getLoadPromise();

      nonGitHub = new Remote('no', 'git@elsewhere.com:abc/def.git');
      github0 = new Remote('yes0', 'git@github.com:user/repo0.git');
      github1 = new Remote('yes1', 'git@github.com:user/repo1.git');

      singleGitHubRemoteSet = new RemoteSet([nonGitHub, github0]);
      multiGitHubRemoteSet = new RemoteSet([nonGitHub, github0, github1]);

      otherBranch = new Branch('other');
      mainBranch = new Branch('main', nullBranch, nullBranch, true);
      branches = new BranchSet([otherBranch, mainBranch]);
    });

    async function installRemoteSet(remoteSet) {
      for (const remote of remoteSet) {
        // In your face, no-await-in-loop rule
        await loadedRepo.addRemote(remote.getName(), remote.getUrl());
      }
    }

    it('derives the subset of GitHub remotes', async function() {
      await installRemoteSet(multiGitHubRemoteSet);

      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const githubRemotes = tokenWrapper.find('GitHubTabController').prop('githubRemotes');

      assert.sameMembers(Array.from(githubRemotes, remote => remote.getName()), ['yes0', 'yes1']);
    });

    it('derives the current branch', async function() {
      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      repoData.branches = branches;
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const currentBranch = tokenWrapper.find('GitHubTabController').prop('currentBranch');

      assert.strictEqual(mainBranch, currentBranch);
    });

    it('identifies the current remote from the config key', async function() {
      await loadedRepo.setConfig('atomGithub.currentRemote', 'yes1');
      await installRemoteSet(multiGitHubRemoteSet);

      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const currentRemote = tokenWrapper.find('GitHubTabController').prop('currentRemote');

      assert.strictEqual(currentRemote.getUrl(), github1.getUrl());
    });

    it('identifies the current remote as the only GitHub remote', async function() {
      await installRemoteSet(singleGitHubRemoteSet);

      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const currentRemote = tokenWrapper.find('GitHubTabController').prop('currentRemote');

      assert.strictEqual(currentRemote.getUrl(), github0.getUrl());
    });

    it('identifies when there are multiple GitHub remotes available', async function() {
      await installRemoteSet(multiGitHubRemoteSet);

      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const controller = tokenWrapper.find('GitHubTabController');

      assert.isFalse(controller.prop('currentRemote').isPresent());
      assert.isTrue(controller.prop('manyRemotesAvailable'));
    });

    it('renders the controller', async function() {
      await installRemoteSet(singleGitHubRemoteSet);

      const wrapper = shallow(buildApp({repository: loadedRepo}));
      const repoData = await wrapper.find('ObserveModel').prop('fetchData')(loadedRepo);
      const repoWrapper = wrapper.find('ObserveModel').renderProp('children')(repoData);
      const tokenWrapper = repoWrapper.find('ObserveModel').renderProp('children')('1234');
      const controller = tokenWrapper.find('GitHubTabController');

      assert.isFalse(controller.prop('isLoading'));
      assert.isFalse(controller.prop('manyRemotesAvailable'));
      assert.strictEqual(controller.prop('token'), '1234');
    });
  });
});
