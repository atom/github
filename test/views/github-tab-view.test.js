import React from 'react';
import {shallow} from 'enzyme';

import {gitHubTabViewProps} from '../fixtures/props/github-tab-props';
import Repository from '../../lib/models/repository';
import Remote, {nullRemote} from '../../lib/models/remote';
import RemoteSet from '../../lib/models/remote-set';
import Branch from '../../lib/models/branch';
import GitHubTabView from '../../lib/views/github-tab-view';

describe('GitHubTabView', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = gitHubTabViewProps(atomEnv, overrideProps.repository || Repository.absent(), overrideProps);
    return <GitHubTabView {...props} />;
  }

  it('renders a RemoteContainer if a remote has been chosen', function() {
    const currentRemote = new Remote('aaa', 'git@github.com:aaa/bbb.git');
    const currentBranch = new Branch('bbb');
    const handlePushBranch = sinon.spy();
    const wrapper = shallow(buildApp({currentRemote, currentBranch, handlePushBranch}));

    const container = wrapper.find('RemoteContainer');
    assert.isTrue(container.exists());
    assert.strictEqual(container.prop('remote'), currentRemote);
    container.prop('onPushBranch')();
    assert.isTrue(handlePushBranch.calledWith(currentBranch, currentRemote));
  });

  it('renders a RemoteSelectorView when many remote choices are available', function() {
    const remotes = new RemoteSet();
    const handleRemoteSelect = sinon.spy();
    const wrapper = shallow(buildApp({
      remotes,
      currentRemote: nullRemote,
      manyRemotesAvailable: true,
      handleRemoteSelect,
    }));

    const selector = wrapper.find('RemoteSelectorView');
    assert.isTrue(selector.exists());
    assert.strictEqual(selector.prop('remotes'), remotes);
    selector.prop('selectRemote')();
    assert.isTrue(handleRemoteSelect.called);
  });

  it('renders a static message when no remotes are available', function() {
    const wrapper = shallow(buildApp({currentRemote: nullRemote, manyRemotesAvailable: false}));
    assert.isTrue(wrapper.find('.github-GitHub-noRemotes').exists());
  });
});
