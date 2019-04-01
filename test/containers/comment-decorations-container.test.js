import React from 'react';
import {shallow} from 'enzyme';
import {QueryRenderer} from 'react-relay';

import {cloneRepository, buildRepository} from '../helpers';
import {queryBuilder} from '../builder/graphql/query';
import Branch from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import GithubLoginModel from '../../lib/models/github-login-model';
import ObserveModel from '../../lib/views/observe-model';
import Remote from '../../lib/models/remote';
import RemoteSet from '../../lib/models/remote-set';
import {InMemoryStrategy, UNAUTHENTICATED, INSUFFICIENT} from '../../lib/shared/keytar-strategy';
import CommentDecorationsContainer from '../../lib/containers/comment-decorations-container';
import repositoryQuery from '../../lib/containers/__generated__/commentDecorationsContainerQuery.graphql.js';
import CommentDecorationsController from '../../lib/controllers/comment-decorations-controller';

describe('CommentDecorationsContainer', function() {
  let atomEnv, workspace, localRepository, loginModel;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    localRepository = await buildRepository(await cloneRepository());
    loginModel = new GithubLoginModel(InMemoryStrategy);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const {repository} = queryBuilder(repositoryQuery).build();

    return (
      <CommentDecorationsContainer
        localRepository={localRepository}
        repository={repository}
        workspace={workspace}
        loginModel={loginModel}
        {...overrideProps}
      />
    );
  }

  it('renders nothing if no GitHub remotes exist', async function() {
    const wrapper = shallow(buildApp());

    const localRepoData = await wrapper.find(ObserveModel).prop('fetchData')(localRepository);
    const localRepoWrapper = wrapper.find(ObserveModel).renderProp('children')(localRepoData);

    const token = await localRepoWrapper.find(ObserveModel).prop('fetchData')(loginModel, localRepoData);
    assert.isNull(token);

    const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
    assert.isTrue(tokenWrapper.isEmptyRender());
  });

  describe('when GitHub remote exists', function() {
    let localRepo, wrapper, localRepoWrapper;
    beforeEach(async function() {
      await loginModel.setToken('https://api.github.com', '1234');

      localRepo = await buildRepository(await cloneRepository());

      wrapper = shallow(buildApp({localRepository: localRepo, loginModel}));

      const origin = new Remote('origin', 'git@github.com:atom/github.git');
      const upstreamBranch = Branch.createRemoteTracking('refs/remotes/origin/master', 'origin', 'refs/heads/master');
      const branch = new Branch('master', upstreamBranch, upstreamBranch, true);

      const repoData = {
        branches: new BranchSet([branch]),
        remotes: new RemoteSet([origin]),
        currentRemote: origin,
        workingDirectoryPath: 'path/path',
      };
      localRepoWrapper = wrapper.find(ObserveModel).renderProp('children')(repoData);

    });

    it('renders nothing if token is UNAUTHENTICATED', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: UNAUTHENTICATED});
      assert.isTrue(tokenWrapper.isEmptyRender());
    });

    it('renders nothing if token is INSUFFICIENT', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: INSUFFICIENT});
      assert.isTrue(tokenWrapper.isEmptyRender());
    });

    it('makes a relay query if token works', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      assert.lengthOf(tokenWrapper.find(QueryRenderer), 1);
    });

    it('renders nothing if query errors', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      const resultWrapper = tokenWrapper.find(QueryRenderer).renderProp('render')({
        error: 'oh noes', props: null, retry: () => {}});
      assert.isTrue(resultWrapper.isEmptyRender());
    });

    it('renders nothing if query is loading', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      const resultWrapper = tokenWrapper.find(QueryRenderer).renderProp('render')({
        error: null, props: null, retry: () => {}});
      assert.isTrue(resultWrapper.isEmptyRender());
    });

    it('renders nothing if query result does not include repository', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      const resultWrapper = tokenWrapper.find(QueryRenderer).renderProp('render')({
        error: null, props: {oh: 'emgee'}, retry: () => {}});
      assert.isTrue(resultWrapper.isEmptyRender());
    });

    it('renders nothing if query result does not include repository ref', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      const resultWrapper = tokenWrapper.find(QueryRenderer).renderProp('render')({
        error: null, props: {repository: {}}, retry: () => {}});
      assert.isTrue(resultWrapper.isEmptyRender());
    });

    it('renders the CommentDecorationsController if result includes repository and ref', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'});
      const repository = {ref: {associatedPullRequests: {nodes: []}}};
      const resultWrapper = tokenWrapper.find(QueryRenderer).renderProp('render')({
        error: null, props: {repository}, retry: () => {}});
      assert.lengthOf(resultWrapper.find(CommentDecorationsController), 1);
    });

  });

});
