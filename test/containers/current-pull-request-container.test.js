import React from 'react';
import {mount} from 'enzyme';

import {ManualStateObserver} from '../helpers';
import {createPullRequestResult} from '../fixtures/factories/pull-request-result';
import {createRepositoryResult} from '../fixtures/factories/repository-result';
import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import CurrentPullRequestContainer from '../../lib/containers/current-pull-request-container';

describe('CurrentPullRequestContainer', function() {
  let observer;

  beforeEach(function() {
    observer = new ManualStateObserver();
  });

  function useEmptyResult() {
    return expectRelayQuery({
      name: 'currentPullRequestContainerQuery',
      variables: {
        headOwner: 'atom',
        headName: 'github',
        headRef: 'refs/heads/master',
        first: 5,
      },
    }, {
      repository: {
        ref: {
          associatedPullRequests: {
            totalCount: 0,
            nodes: [],
          },
          id: 'ref0',
        },
        id: 'repository0',
      },
    });
  }

  function useResults(...attrs) {
    return expectRelayQuery({
      name: 'currentPullRequestContainerQuery',
      variables: {
        headOwner: 'atom',
        headName: 'github',
        headRef: 'refs/heads/master',
        first: 5,
      },
    }, {
      repository: {
        ref: {
          associatedPullRequests: {
            totalCount: attrs.length,
            nodes: attrs.map(createPullRequestResult),
          },
          id: 'ref0',
        },
        id: 'repository0',
      },
    });
  }

  function buildApp(overrideProps = {}) {
    const origin = new Remote('origin', 'git@github.com:atom/github.git');
    const upstreamBranch = Branch.createRemoteTracking('refs/remotes/origin/master', 'origin', 'refs/heads/master');
    const branch = new Branch('master', upstreamBranch, upstreamBranch, true);
    const branchSet = new BranchSet();
    branchSet.add(branch);

    const remotesByName = new Map([['origin', origin]]);

    return (
      <CurrentPullRequestContainer
        repository={createRepositoryResult()}

        token="1234"
        host="https://api.github.com/"
        remoteOperationObserver={observer}
        remote={origin}
        remotesByName={remotesByName}
        branches={branchSet}
        aheadCount={0}
        pushInProgress={false}

        onOpenIssueish={() => {}}
        onCreatePr={() => {}}

        {...overrideProps}
      />
    );
  }

  it('performs no query without an upstream remote', function() {
    const branch = new Branch('local', nullBranch, nullBranch, true);
    const branchSet = new BranchSet();
    branchSet.add(branch);

    const wrapper = mount(buildApp({branches: branchSet}));

    assert.isFalse(wrapper.find('ReactRelayQueryRenderer').exists());
    const list = wrapper.find('BareIssueishListController');
    assert.isTrue(list.exists());
    assert.isFalse(list.prop('isLoading'));
    assert.strictEqual(list.prop('total'), 0);
    assert.lengthOf(list.prop('results'), 0);
  });

  it('passes an empty result list and an isLoading prop to the controller while loading', async function() {
    const {resolve, promise} = useEmptyResult();

    const wrapper = mount(buildApp());
    assert.isTrue(wrapper.find('BareIssueishListController').prop('isLoading'));

    resolve();
    await promise;

    assert.isFalse(wrapper.update().find('BareIssueishListController').prop('isLoading'));
  });

  it('passes an empty result list and an error prop to the controller when errored', async function() {
    const {reject, promise} = useEmptyResult();

    const e = new Error('oh no');
    e.rawStack = e.stack;
    reject(e);
    await promise.catch(() => null);

    const wrapper = mount(buildApp());
    await assert.async.isFalse(wrapper.update().find('BareIssueishListController').prop('isLoading'));

    assert.strictEqual(wrapper.find('BareIssueishListController').prop('error'), e);
  });

  it('passes a configured pull request creation tile to the controller', async function() {
    const {resolve, promise} = useEmptyResult();

    resolve();
    await promise;

    const wrapper = mount(buildApp());
    await assert.async.isFalse(wrapper.update().find('BareIssueishListController').prop('isLoading'));

    assert.isTrue(wrapper.find('CreatePullRequestTile').exists());
  });

  it('passes results to the controller', async function() {
    const {resolve, promise} = useResults({number: 10});

    const wrapper = mount(buildApp());

    resolve();
    await promise;

    const controller = wrapper.update().find('BareIssueishListController');
    assert.strictEqual(controller.prop('total'), 1);
    assert.deepEqual(controller.prop('results').map(result => result.number), [10]);
  });

  it.only('filters out pull requests opened on different repositories', async function() {
    const repository = createRepositoryResult({id: 'upstream-repo'});

    const {resolve, promise} = useResults(
      {number: 11, repositoryID: 'upstream-repo'},
      {number: 22, repositoryID: 'someones-fork'},
    );

    const wrapper = mount(buildApp({repository}));
    resolve();
    await promise;
    wrapper.update();

    const numbers = wrapper.find('IssueishListView').prop('issueishes').map(i => i.number());
    assert.deepEqual(numbers, ['#11']);
  });

  it('performs the query again when a remote operation completes', async function() {
    const {resolve: resolve0, promise: promise0, disable: disable0} = useResults({number: 0});

    const wrapper = mount(buildApp());

    resolve0();
    await promise0;

    wrapper.update();
    const controller = wrapper.find('BareIssueishListController');
    assert.deepEqual(controller.prop('results').map(result => result.number), [0]);

    disable0();
    const {resolve: resolve1, promise: promise1} = useResults({number: 1});

    resolve1();
    await promise1;

    wrapper.update();
    assert.deepEqual(controller.prop('results').map(result => result.number), [0]);

    observer.trigger();

    await assert.async.deepEqual(
      wrapper.update().find('BareIssueishListController').prop('results').map(result => result.number),
      [1],
    );
  });
});
