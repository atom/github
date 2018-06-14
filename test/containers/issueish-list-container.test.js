import React from 'react';
import {shallow, mount} from 'enzyme';

import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import Search, {nullSearch} from '../../lib/models/search';
import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import IssueishListContainer from '../../lib/containers/issueish-list-container';

describe('IssueishListContainer', function() {
  function buildApp(overrideProps = {}) {
    const origin = new Remote('origin', 'git@github.com:atom/github.git');
    const branch = new Branch('master', nullBranch, nullBranch, true);
    const branchSet = new BranchSet();
    branchSet.add(branch);

    return (
      <IssueishListContainer
        token={'1234'}
        host={'https://api.github.com/'}

        search={new Search('default', 'type:pr')}
        remote={origin}
        branches={branchSet}
        aheadCount={0}
        pushInProgress={false}

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

  it('passes results to the controller', async function() {
    const {promise, resolve} = expectRelayQuery({
      name: 'issueishListContainerQuery',
      variables: {
        query: 'type:pr author:me',
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
});
