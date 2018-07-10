import React from 'react';
import {mount} from 'enzyme';

import {cloneRepository, initRepository, buildRepository} from '../helpers';
import GithubTabController from '../../lib/controllers/github-tab-controller';
import Repository from '../../lib/models/repository';
import Branch from '../../lib/models/branch';
import GithubLoginModel from '../../lib/models/github-login-model';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';

describe('GithubTabController', function() {
  let atomEnv, loginModel;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    loginModel = new GithubLoginModel(InMemoryStrategy);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    return (
      <GithubTabController
        repository={Repository.absent()}
        workspace={atomEnv.workspace}
        loginModel={loginModel}
        {...overrideProps}
      />
    );
  }

  it('renders nothing when the repository is absent', async function() {
    const wrapper = mount(buildApp({repository: Repository.absent()}));
    await assert.async.lengthOf(wrapper.update().find('ObserveModel').children(), 0);
  });

  it('renders a RemoteContainer when only a single dotcom Remote is present', async function() {
    const repository = await buildRepository(await cloneRepository());
    await repository.addRemote('single', 'git@github.com:owner/name.git');
    await repository.addRemote('nondotcom', 'git@sourceforge.net:owner/name.git');

    const wrapper = mount(buildApp({repository}));
    await assert.async.isTrue(wrapper.update().find('RemoteContainer').exists());

    const container = wrapper.find('RemoteContainer');
    assert.strictEqual(container.prop('loginModel'), loginModel);
    assert.strictEqual(container.prop('workspace'), atomEnv.workspace);
    assert.strictEqual(container.prop('workingDirectory'), repository.getWorkingDirectoryPath());
    assert.strictEqual(container.prop('remote').getName(), 'single');

    sinon.stub(repository, 'push').resolves();
    await container.prop('onPushBranch')();

    assert.isTrue(repository.push.calledWith('master', {remote: container.prop('remote'), setUpstream: true}));
  });

  it('renders a RemoteSelectorView when multiple Remotes are present', async function() {
    const repository = await buildRepository(await cloneRepository());
    await repository.addRemote('one', 'git@github.com:owner/name.git');
    await repository.addRemote('nondotcom', 'git@sourceforge.net:owner/name.git');
    await repository.addRemote('two', 'git@github.com:owner/name.git');
    const chosen = await repository.addRemote('three', 'git@github.com:owner/name.git');

    const wrapper = mount(buildApp({repository}));
    await assert.async.isTrue(wrapper.update().find('RemoteSelectorView').exists());

    const view = wrapper.find('RemoteSelectorView');
    assert.strictEqual(view.prop('remotes').size(), 3);

    const e = {preventDefault: sinon.spy()};
    await view.prop('selectRemote')(e, chosen);

    assert.isTrue(e.preventDefault.called);
    assert.strictEqual(await repository.getConfig('atomGithub.currentRemote'), 'three');
  });

  it('renders a RemoteContainer when multiple Remotes are present, but one has been selected', async function() {
    const repository = await buildRepository(await cloneRepository());
    await repository.addRemote('one', 'git@github.com:owner/name.git');
    await repository.addRemote('two', 'git@github.com:owner/name.git');
    await repository.addRemote('nondotcom', 'git@sourceforge.net:owner/name.git');
    await repository.addRemote('three', 'git@github.com:owner/name.git');
    await repository.setConfig('atomGithub.currentRemote', 'two');

    const wrapper = mount(buildApp({repository}));
    await assert.async.isTrue(wrapper.update().find('RemoteContainer').exists());
    const container = wrapper.find('RemoteContainer');
    assert.strictEqual(container.prop('remote').getName(), 'two');
  });

  it('renders a static message when no dotcom remotes are present', async function() {
    const repository = await buildRepository(await initRepository());
    await repository.addRemote('nondotcom', 'git@sourceforge.net:owner/name.git');

    const wrapper = mount(buildApp({repository}));
    await assert.async.isTrue(wrapper.update().find('.github-GithubTabController-no-remotes').exists());
  });
});
