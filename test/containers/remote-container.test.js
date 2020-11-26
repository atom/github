import React from 'react';
import {shallow} from 'enzyme';
import {QueryRenderer} from 'react-relay';

import RemoteContainer from '../../lib/containers/remote-container';
import {queryBuilder} from '../builder/graphql/query';
import Remote from '../../lib/models/remote';
import RemoteSet from '../../lib/models/remote-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import {DOTCOM} from '../../lib/models/endpoint';
import Refresher from '../../lib/models/refresher';

import remoteQuery from '../../lib/containers/__generated__/remoteContainerQuery.graphql';

describe('RemoteContainer', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const origin = new Remote('origin', 'git@github.com:atom/github.git');
    const remotes = new RemoteSet([origin]);
    const branch = new Branch('master', nullBranch, nullBranch, true);
    const branches = new BranchSet([branch]);

    return (
      <RemoteContainer
        endpoint={DOTCOM}
        token="1234"

        refresher={new Refresher()}
        pushInProgress={false}
        workingDirectory={__dirname}
        workspace={atomEnv.workspace}
        remote={origin}
        remotes={remotes}
        branches={branches}
        aheadCount={0}

        handleLogin={() => {}}
        handleLogout={() => {}}
        onPushBranch={() => {}}

        {...overrideProps}
      />
    );
  }

  it('renders a loading spinner while the GraphQL query is being performed', function() {
    const wrapper = shallow(buildApp());
    const resultWrapper = wrapper.find(QueryRenderer).renderProp('render')({
      error: null,
      props: null,
      retry: () => {},
    });

    assert.isTrue(resultWrapper.exists('LoadingView'));
  });

  it('renders an error message if the GraphQL query fails', function() {
    const wrapper = shallow(buildApp());

    const error = new Error('oh shit!');
    error.rawStack = error.stack;
    const resultWrapper = wrapper.find(QueryRenderer).renderProp('render')({error, props: null, retry: () => {}});

    assert.strictEqual(resultWrapper.find('QueryErrorView').prop('error'), error);
  });

  it('renders the controller once results have arrived', function() {
    const wrapper = shallow(buildApp());

    const props = queryBuilder(remoteQuery)
      .repository(r => {
        r.id('the-repo');
        r.defaultBranchRef(dbr => {
          dbr.prefix('refs/heads/');
          dbr.name('devel');
        });
      })
      .build();
    const resultWrapper = wrapper.find(QueryRenderer).renderProp('render')({error: null, props, retry: () => {}});

    const controller = resultWrapper.find('RemoteController');
    assert.deepEqual(controller.prop('repository'), {
      id: 'the-repo',
      defaultBranchRef: {
        prefix: 'refs/heads/',
        name: 'devel',
      },
    });
  });
});
