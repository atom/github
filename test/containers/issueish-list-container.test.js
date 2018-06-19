import React from 'react';
import {shallow, mount} from 'enzyme';
import {Emitter} from 'event-kit';

import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import Search, {nullSearch} from '../../lib/models/search';
import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import IssueishListContainer from '../../lib/containers/issueish-list-container';

describe('IssueishListContainer', function() {
  let observer;

  beforeEach(function() {
    observer = {
      emitter: new Emitter(),

      onDidComplete(callback) {
        return this.emitter.on('did-complete', callback);
      },

      trigger() {
        this.emitter.emit('did-complete');
      },

      dispose() {
        this.emitter.dispose();
      },
    };
  });

  afterEach(function() {
    observer.dispose();
  });

  function buildApp(overrideProps = {}) {
    const origin = new Remote('origin', 'git@github.com:atom/github.git');
    const branch = new Branch('master', nullBranch, nullBranch, true);
    const branchSet = new BranchSet();
    branchSet.add(branch);

    return (
      <IssueishListContainer
        token="1234"
        host="https://api.github.com/"

        repository={null}
        remoteOperationObserver={observer}

        search={new Search('default', 'type:pr')}
        remote={origin}
        branches={branchSet}
        aheadCount={0}
        pushInProgress={false}

        onOpenIssueish={() => {}}
        onOpenSearch={() => {}}
        onCreatePr={() => {}}

        {...overrideProps}
      />
    );
  }

  function createPullRequest(number) {
    return {
      __typename: 'PullRequest',
      id: number.toString(),
      number,
      title: 'One',
      url: 'https://github.com/atom/github/1',
      author: {
        __typename: 'User',
        id: 'u0',
        login: 'smashwilson',
        avatarUrl: 'https://avatar.com/yes.jpg',
      },
      createdAt: '2018-06-12T14:50:08Z',
      headRefName: 'aw/something',
      headRepository: {
        id: 'r0',
        nameWithOwner: 'atom/github',
      },
      commits: {
        id: 'cs0',
        nodes: [
          {
            id: 'n0',
            commit: {
              id: 'c0',
              status: null,
            },
          },
        ],
      },
    };
  }

  it('performs no query for a null Search', function() {
    const wrapper = shallow(buildApp({search: nullSearch}));

    assert.isFalse(wrapper.find('ReactRelayQueryRenderer').exists());
    const list = wrapper.find('BareIssueishListController');
    assert.isTrue(list.exists());
    assert.isFalse(list.prop('isLoading'));
    assert.deepEqual(list.prop('results'), {
      issueCount: 0,
      nodes: [],
    });
  });

  it('renders a query for the Search', function() {
    const {resolve} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
      },
    }, {
      search: {issueCount: 0, nodes: []},
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = shallow(buildApp({search}));
    assert.strictEqual(wrapper.find('ReactRelayQueryRenderer').prop('variables').query, 'type:pr author:me');
    resolve();
  });

  it('passes an empty result list and an isLoading prop to the controller while loading', function() {
    const {resolve} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {issueCount: 0, nodes: []},
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = mount(buildApp({search}));

    const controller = wrapper.find('BareIssueishListController');
    assert.isTrue(controller.prop('isLoading'));

    resolve();
  });

  it('passes an empty result list and an error prop to the controller when errored', async function() {
    const {reject} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr',
        first: 20,
      },
    }, {});
    const e = new Error('error');
    e.rawStack = e.stack;
    reject(e);

    const wrapper = mount(buildApp({}));

    await assert.async.isTrue(
      wrapper.update().find('BareIssueishListController').filterWhere(n => !n.prop('isLoading')).exists(),
    );
    const controller = wrapper.find('BareIssueishListController');
    assert.strictEqual(controller.prop('error'), e);
    assert.deepEqual(controller.prop('results'), {
      issueCount: 0,
      nodes: [],
    });
  });

  it('passes results to the controller', async function() {
    const {promise, resolve} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 2,
        nodes: [
          createPullRequest(1),
          createPullRequest(2),
        ],
      },
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = mount(buildApp({search}));

    resolve();
    await promise;

    const controller = wrapper.update().find('BareIssueishListController');
    assert.isFalse(controller.prop('isLoading'));
  });

  it('performs the query again when a remote operation completes', async function() {
    const {promise: promise0, resolve: resolve0, disable: disable0} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 1,
        nodes: [createPullRequest(1)],
      },
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = mount(buildApp({search}));
    resolve0();
    await promise0;

    assert.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').nodes.some(node => node.number === 1),
    );

    disable0();
    const {promise: promise1, resolve: resolve1} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 1,
        nodes: [createPullRequest(2)],
      },
    });

    resolve1();
    await promise1;

    assert.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').nodes.some(node => node.number === 1),
    );

    observer.trigger();

    await assert.async.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').nodes.some(node => node.number === 2),
    );
  });
});
