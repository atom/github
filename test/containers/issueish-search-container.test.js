import React from 'react';
import {shallow, mount} from 'enzyme';

import {expectRelayQuery} from '../../lib/relay-network-layer-manager';
import {createPullRequestResult} from '../fixtures/factories/pull-request-result';
import Search, {nullSearch} from '../../lib/models/search';
import IssueishSearchContainer from '../../lib/containers/issueish-search-container';
import {ManualStateObserver} from '../helpers';

describe('IssueishSearchContainer', function() {
  let observer;

  beforeEach(function() {
    observer = new ManualStateObserver();
  });

  function buildApp(overrideProps = {}) {
    return (
      <IssueishSearchContainer
        token="1234"
        host="https://api.github.com/"
        search={new Search('default', 'type:pr')}
        remoteOperationObserver={observer}

        onOpenIssueish={() => {}}
        onOpenSearch={() => {}}

        {...overrideProps}
      />
    );
  }

  it('performs no query for a null Search', function() {
    const wrapper = shallow(buildApp({search: nullSearch}));

    assert.isFalse(wrapper.find('ReactRelayQueryRenderer').exists());
    const list = wrapper.find('BareIssueishListController');
    assert.isTrue(list.exists());
    assert.isFalse(list.prop('isLoading'));
    assert.strictEqual(list.prop('total'), 0);
    assert.lengthOf(list.prop('results'), 0);
  });

  it('renders a query for the Search', async function() {
    const {resolve, promise} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
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
    await promise;
  });

  it('passes an empty result list and an isLoading prop to the controller while loading', async function() {
    const {resolve, promise} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
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
    await promise;
  });

  it('passes an empty result list and an error prop to the controller when errored', async function() {
    const {reject} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
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
    assert.lengthOf(controller.prop('results'), 0);
  });

  it('passes results to the controller', async function() {
    const {promise, resolve} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 2,
        nodes: [
          createPullRequestResult({number: 1}),
          createPullRequestResult({number: 2}),
        ],
      },
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = mount(buildApp({search}));

    resolve();
    await promise;

    const controller = wrapper.update().find('BareIssueishListController');
    assert.isFalse(controller.prop('isLoading'));
    assert.strictEqual(controller.prop('total'), 2);
    assert.isTrue(controller.prop('results').some(node => node.number === 1));
    assert.isTrue(controller.prop('results').some(node => node.number === 2));
  });

  it('performs the query again when a remote operation completes', async function() {
    const {promise: promise0, resolve: resolve0, disable: disable0} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 1,
        nodes: [createPullRequestResult({number: 1})],
      },
    });

    const search = new Search('pull requests', 'type:pr author:me');
    const wrapper = mount(buildApp({search}));
    resolve0();
    await promise0;

    assert.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').some(node => node.number === 1),
    );

    disable0();
    const {promise: promise1, resolve: resolve1} = expectRelayQuery({
      name: 'issueishSearchContainerQuery',
      variables: {
        query: 'type:pr author:me',
        first: 20,
      },
    }, {
      search: {
        issueCount: 1,
        nodes: [createPullRequestResult({number: 2})],
      },
    });

    resolve1();
    await promise1;

    assert.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').some(node => node.number === 1),
    );

    observer.trigger();

    await assert.async.isTrue(
      wrapper.update().find('BareIssueishListController').prop('results').some(node => node.number === 2),
    );
  });
});
