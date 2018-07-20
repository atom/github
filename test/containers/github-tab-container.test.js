import React from 'react';
import {mount} from 'enzyme';

import {cloneRepository} from '../helpers';
import GitHubTabContainer from '../../lib/containers/github-tab-container';
import Repository from '../../lib/models/repository';
import {gitHubTabContainerProps} from '../fixtures/props/github-tab-props';

describe('GitHubTabContainer', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const repository = Repository.absent();
    return <GitHubTabContainer {...gitHubTabContainerProps(atomEnv, repository, overrideProps)} />;
  }

  describe('operation state observer', function() {
    it('creates an observer on the current repository', function() {
      const repository = Repository.absent();
      const wrapper = mount(buildApp({repository}));

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
    it('renders a loading spinner', async function() {
      const repository = new Repository(await cloneRepository());
      assert.isTrue(repository.isLoading());
      const wrapper = mount(buildApp({repository}));

      assert.isTrue(wrapper.find('LoadingView').exists());
    });
  });

  describe('once loaded', function() {
    it('renders the controller', async function() {
      const workdir = await cloneRepository();
      const repository = new Repository(workdir);
      await repository.getLoadPromise();
      const wrapper = mount(buildApp({repository}));

      await assert.async.isTrue(wrapper.update().find('GitHubTabController').exists());
      assert.strictEqual(wrapper.find('GitHubTabController').prop('workingDirectory'), workdir);
    });
  });
});
