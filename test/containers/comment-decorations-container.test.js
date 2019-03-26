import React from 'react';
import {shallow} from 'enzyme';
import {QueryRenderer} from 'react-relay';

import {cloneRepository, buildRepository} from '../helpers';
import {queryBuilder} from '../builder/graphql/query';
import GithubLoginModel from '../../lib/models/github-login-model';
import ObserveModel from '../../lib/views/observe-model';
import Remote from '../../lib/models/remote';
import Repository from '../../lib/models/repository';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import CommentDecorationsContainer from '../../lib/containers/comment-decorations-container';
import repositoryQuery from '../../lib/containers/__generated__/commentDecorationsContainerQuery.graphql.js';
import CommentDecorationsController from '../../lib/controllers/comment-decorations-controller';

describe('CommentDecorationsContainer', function() {
  let atomEnv, workspace, localRepository;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    localRepository = await buildRepository(await cloneRepository());
    await localRepository.getLoadPromise();
    await localRepository.refresh();
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

  it('does not query if no GitHub remotes exist', function() {
  });

  describe('when GitHub remote exists', function() {
    it('passes query results to controller', function() {
    });

    it('renders nothing if query errors', function() {

    });

    it('renders nothing if query is loading', function() {

    });
  });

});
