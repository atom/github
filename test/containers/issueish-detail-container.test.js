import React from 'react';
import {mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import {issueishDetailContainerProps} from '../fixtures/props/issueish-pane-props';
import {createPullRequestDetailResult} from '../fixtures/factories/pull-request-result';
import GithubLoginModel from '../../lib/models/github-login-model';
import {InMemoryStrategy, UNAUTHENTICATED} from '../../lib/shared/keytar-strategy';
import IssueishDetailContainer from '../../lib/containers/issueish-detail-container';

describe('IssueishDetailContainer', function() {
  let loginModel, repository;

  beforeEach(async function() {
    loginModel = new GithubLoginModel(InMemoryStrategy);

    const workDir = await cloneRepository();
    repository = await buildRepository(workDir);
  });

  function useResult() {
    return expectRelayQuery({
      name: 'issueishDetailContainerQuery',
      variables: {
        repoOwner: 'owner',
        repoName: 'repo',
        issueishNumber: 1,
        timelineCount: 100,
        timelineCursor: null,
      },
    }, {
      repository: {
        id: 'repository0',
        name: 'repo',
        owner: {
          __typename: 'User',
          login: 'owner',
          id: 'user0',
        },
        issueish: createPullRequestDetailResult(),
      },
    });
  }

  function buildApp(overrideProps = {}) {
    return <IssueishDetailContainer {...issueishDetailContainerProps({loginModel, repository, ...overrideProps})} />;
  }

  it('renders a spinner while the token is being fetched', function() {
    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it('renders a login prompt if the user is unauthenticated', async function() {
    const wrapper = mount(buildApp());
    await assert.async.isTrue(wrapper.update().find('GithubLoginView').exists());
  });

  it("renders a login prompt if the user's token has insufficient scopes", async function() {
    loginModel.setToken('https://api.github.com', '1234');
    sinon.stub(loginModel, 'getScopes').resolves(['not-enough']);

    const wrapper = mount(buildApp());
    await assert.async.isTrue(wrapper.update().find('GithubLoginView').exists());
  });

  it('re-renders on login', async function() {
    useResult();
    sinon.stub(loginModel, 'getScopes').resolves(GithubLoginModel.REQUIRED_SCOPES);

    const wrapper = mount(buildApp());

    await assert.async.isTrue(wrapper.update().find('GithubLoginView').exists());
    wrapper.find('GithubLoginView').prop('onLogin')('4321');

    await assert.async.isTrue(wrapper.update().find('ReactRelayQueryRenderer').exists());
  });

  it('renders a spinner while the GraphQL query is being performed', async function() {
    useResult();

    loginModel.setToken('https://api.github.com', '1234');
    sinon.spy(loginModel, 'getToken');
    sinon.stub(loginModel, 'getScopes').resolves(GithubLoginModel.REQUIRED_SCOPES);

    const wrapper = mount(buildApp());
    await loginModel.getToken.returnValues[0];

    assert.isTrue(wrapper.update().find('LoadingView').exists());
  });

  it('renders an error view if the GraphQL query fails', async function() {
    const {reject, promise} = useResult();

    loginModel.setToken('https://api.github.com', '1234');
    sinon.stub(loginModel, 'getScopes').resolves(GithubLoginModel.REQUIRED_SCOPES);

    const wrapper = mount(buildApp());
    const e = new Error('wat');
    e.rawStack = e.stack;
    reject(e);
    await promise.catch(() => {});

    await assert.async.isTrue(wrapper.update().find('QueryErrorView').exists());
    const ev = wrapper.find('QueryErrorView');
    assert.strictEqual(ev.prop('error'), e);

    assert.strictEqual(await loginModel.getToken('https://api.github.com'), '1234');
    await ev.prop('logout')();
    assert.strictEqual(await loginModel.getToken('https://api.github.com'), UNAUTHENTICATED);
  });

  it('passes GraphQL query results to an IssueishDetailController', async function() {
    const {resolve} = useResult();
    loginModel.setToken('https://api.github.com', '1234');
    sinon.stub(loginModel, 'getScopes').resolves(GithubLoginModel.REQUIRED_SCOPES);

    const wrapper = mount(buildApp());
    resolve();

    await assert.async.isTrue(wrapper.update().find('BareIssueishDetailController').exists());

    const controller = wrapper.find('BareIssueishDetailController');
    assert.isDefined(controller.prop('repository'));
    assert.strictEqual(controller.prop('issueishNumber'), 1);
  });
});
