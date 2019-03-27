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
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import CommentDecorationsContainer from '../../lib/containers/comment-decorations-container';
import repositoryQuery from '../../lib/containers/__generated__/commentDecorationsContainerQuery.graphql.js';

describe('CommentDecorationsContainer', function() {
  let atomEnv, workspace, localRepository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    localRepository = await buildRepository(await cloneRepository());
    await localRepository.getLoadPromise();
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
        loginModel={new GithubLoginModel(InMemoryStrategy)}
        {...overrideProps}
      />
    );
  }

  it('does not query if no GitHub remotes exist', async function() {
    const wrapper = shallow(buildApp());
    const localRepoWrapper = wrapper.find(ObserveModel).renderProp('children')();

    await localRepository.refresh();
    // why does localRepoWrapper.find(ObserveModel) have no props??
    const localRepoData = await localRepoWrapper.find(ObserveModel).prop('fetchData');
  });

  describe('when GitHub remote exists', function() {
    let localRepo, wrapper, localRepoWrapper;
    beforeEach(async function() {
      const loginModel = new GithubLoginModel(InMemoryStrategy);
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
      }
      localRepoWrapper = wrapper.find(ObserveModel).renderProp('children')(repoData);

    })
    it('makes a relay query', function() {
      const tokenWrapper = localRepoWrapper.find(ObserveModel).renderProp('children')({token: '1234'})
      assert.lengthOf(tokenWrapper.find(QueryRenderer), 1);
    });

    it('renders nothing if query errors', function() {

    });

    it('renders nothing if query is loading', function() {

    });
  });

});
