import React from 'react';
import {shallow} from 'enzyme';

import CreateDialogContainer from '../../lib/containers/create-dialog-container';
import {InMemoryStrategy} from '../../lib/shared/keytar-strategy';
import GithubLoginModel from '../../lib/models/github-login-model';

describe('CreateDialogContainer', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const loginModel = new GithubLoginModel(InMemoryStrategy);

    return (
      <CreateDialogContainer
        loginModel={loginModel}
        {...override}
      />
    );
  }

  it('renders the dialog view in a loading state before the token is provided', async function() {
    const loginModel = new GithubLoginModel(InMemoryStrategy);
    loginModel.setToken('https://api.github.com', '12345');

    const wrapper = shallow(buildApp({loginModel}));

    const observer = wrapper.find('ObserveModel');
    assert.strictEqual(observer.prop('model'), loginModel);
    assert.strictEqual(await observer.prop('fetchData')(loginModel), '12345');

    const tokenWrapper = observer.renderProp('children')(null);
    assert.isTrue(tokenWrapper.find('CreateDialogView').prop('isLoading'));
  });

  it('renders the dialog view in a loading state before the GraphQL query completes', function() {
    const wrapper = shallow(buildApp());
    const tokenWrapper = wrapper.find('ObserveModel').renderProp('children')('12345');

    const query = tokenWrapper.find('QueryRenderer');
    const queryWrapper = query.renderProp('render')({error: null, props: null});

    assert.isTrue(queryWrapper.find('CreateDialogView').prop('isLoading'));
  });

  it('passes GraphQL errors to the dialog view');

  it('passes GraphQL query results to the dialog view');
});
