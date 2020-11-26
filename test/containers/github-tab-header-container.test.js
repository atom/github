import React from 'react';
import {shallow} from 'enzyme';
import {QueryRenderer} from 'react-relay';

import GithubTabHeaderContainer from '../../lib/containers/github-tab-header-container';
import {queryBuilder} from '../builder/graphql/query';
import {DOTCOM} from '../../lib/models/endpoint';
import {UNAUTHENTICATED, INSUFFICIENT} from '../../lib/shared/keytar-strategy';

import tabHeaderQuery from '../../lib/containers/__generated__/githubTabHeaderContainerQuery.graphql';

describe('GithubTabHeaderContainer', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    return (
      <GithubTabHeaderContainer
        endpoint={DOTCOM}
        token="1234"

        currentWorkDir={null}
        contextLocked={false}
        changeWorkingDirectory={() => {}}
        setContextLock={() => {}}
        getCurrentWorkDirs={() => new Set()}

        onDidChangeWorkDirs={() => {}}
        {...overrideProps}
      />
    );
  }

  it('renders a null user if the token is still loading', function() {
    const wrapper = shallow(buildApp({token: null}));
    assert.isFalse(wrapper.find('GithubTabHeaderController').prop('user').isPresent());
  });

  it('renders a null user if no token is found', function() {
    const wrapper = shallow(buildApp({token: UNAUTHENTICATED}));
    assert.isFalse(wrapper.find('GithubTabHeaderController').prop('user').isPresent());
  });

  it('renders a null user if the token has insufficient OAuth scopes', function() {
    const wrapper = shallow(buildApp({token: INSUFFICIENT}));
    assert.isFalse(wrapper.find('GithubTabHeaderController').prop('user').isPresent());
  });

  it('renders a null user if there was an error acquiring the token', function() {
    const e = new Error('oops');
    e.rawStack = e.stack;
    const wrapper = shallow(buildApp({token: e}));
    assert.isFalse(wrapper.find('GithubTabHeaderController').prop('user').isPresent());
  });

  it('renders a null user while the GraphQL query is being performed', function() {
    const wrapper = shallow(buildApp());
    const resultWrapper = wrapper.find(QueryRenderer).renderProp('render')({
      error: null,
      props: null,
      retry: () => {},
    });

    assert.isFalse(resultWrapper.find('GithubTabHeaderController').prop('user').isPresent());
  });

  it('renders the controller once results have arrived', function() {
    const wrapper = shallow(buildApp());
    const props = queryBuilder(tabHeaderQuery)
      .viewer(v => {
        v.name('user');
        v.email('us3r@email.com');
        v.avatarUrl('https://imageurl.com/test.jpg');
        v.login('us3rh4nd13');
      })
      .build();
    const resultWrapper = wrapper.find(QueryRenderer).renderProp('render')({error: null, props, retry: () => {}});

    const controller = resultWrapper.find('GithubTabHeaderController');
    assert.isTrue(controller.prop('user').isPresent());
    assert.strictEqual(controller.prop('user').getEmail(), 'us3r@email.com');
  });
});
