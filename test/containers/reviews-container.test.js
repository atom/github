import React from 'react';
import {mount} from 'enzyme';

import ReviewsContainer from '../../lib/containers/reviews-container';
import Repository from '../../lib/models/repository';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../lib/models/github-login-model';
import {getEndpoint} from '../../lib/models/endpoint';
import {cloneRepository} from '../helpers';

describe('ReviewsContainer', function() {
  let atomEnv, repository, loginModel;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    const workdir = await cloneRepository();
    repository = new Repository(workdir);
    await repository.getLoadPromise();
    loginModel = new GithubLoginModel(InMemoryStrategy);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      endpoint: getEndpoint('github.com'),
      owner: 'atom',
      repo: 'github',
      number: 1234,
      repository,
      loginModel,
      ...override,
    };

    return <ReviewsContainer {...props} />;
  }

  it('renders a loading spinner while the token is loading', function() {
    sinon.stub(loginModel, 'getToken').returns(new Promise(() => {}));

    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.exists('LoadingView'));
  });
});
