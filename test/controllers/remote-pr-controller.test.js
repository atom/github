import React from 'react';
import {mount} from 'enzyme';

import GithubLoginModel from '../../lib/models/github-login-model';
import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import Remote from '../../lib/models/remote';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import {InMemoryStrategy, UNAUTHENTICATED, INSUFFICIENT} from '../../lib/shared/keytar-strategy';
import RemotePrController from '../../lib/controllers/remote-pr-controller';

describe('RemotePrController', function() {
  let loginModel, remote, branchSet, currentBranch;

  beforeEach(function() {
    loginModel = new GithubLoginModel(InMemoryStrategy);
    sinon.stub(loginModel, 'getToken').returns(Promise.resolve('1234'));

    remote = new Remote('origin', 'git@github.com:atom/github');
    currentBranch = new Branch('master', nullBranch, nullBranch, true);
    branchSet = new BranchSet();
    branchSet.add(currentBranch);

    expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {query: 'repo:atom/github type:pr state:open'},
    }, {
      repository: {
        defaultBranchRef: {
          prefix: 'refs/heads',
          name: 'master',
        },
        pullRequests: {
          totalCount: 0,
          edges: [],
        },
        id: '1',
      },
    });
  });

  function createApp(props = {}) {
    const noop = () => {};

    return (
      <RemotePrController
        loginModel={loginModel}
        host="https://api.github.com"

        remote={remote}
        branches={branchSet}

        aheadCount={0}
        pushInProgress={false}

        onPushBranch={noop}

        {...props}
      />
    );
  }

  it('renders a loading message while fetching the token', function() {
    const wrapper = mount(createApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it('shows the login view if unauthenticated', async function() {
    loginModel.getToken.restore();
    sinon.stub(loginModel, 'getToken').returns(Promise.resolve(UNAUTHENTICATED));

    const wrapper = mount(createApp());

    await assert.async.isTrue(wrapper.update().find('GithubLoginView').exists());
    assert.strictEqual(
      wrapper.find('GithubLoginView').find('p').text(),
      'Log in to GitHub to access PR information and more!',
    );
  });

  it('shows the login view if more scopes are required', async function() {
    loginModel.getToken.restore();
    sinon.stub(loginModel, 'getToken').returns(Promise.resolve(INSUFFICIENT));

    const wrapper = mount(createApp());

    await assert.async.isTrue(wrapper.update().find('GithubLoginView').exists());
    assert.strictEqual(
      wrapper.find('GithubLoginView').find('p').text(),
      'Your token no longer has sufficient authorizations. Please re-authenticate and generate a new one.',
    );
  });

  it('renders issueish searches if authenticated', async function() {
    const wrapper = mount(createApp());

    await assert.async.isTrue(wrapper.update().find('IssueishSearchController').exists());

    const controller = wrapper.update().find('IssueishSearchController');
    assert.strictEqual(controller.prop('token'), '1234');
    assert.strictEqual(controller.prop('host'), 'https://api.github.com');
    assert.strictEqual(controller.prop('remote'), remote);
    assert.strictEqual(controller.prop('branches'), branchSet);
  });
});
