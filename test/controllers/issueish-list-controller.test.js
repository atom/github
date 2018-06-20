import React from 'react';
import {shallow} from 'enzyme';

import {createPullRequestResult} from '../fixtures/factories/pull-request-result';
import Issueish from '../../lib/models/issueish';
import {BareIssueishListController} from '../../lib/controllers/issueish-list-controller';

describe('IssueishListController', function() {
  function buildApp(overrideProps = {}) {
    return (
      <BareIssueishListController
        title="title"
        results={null}
        repository={null}

        isLoading={false}

        onOpenIssueish={() => {}}
        onOpenMore={() => {}}

        {...overrideProps}
      />
    );
  }

  it('renders an IssueishListView in a loading state', function() {
    const wrapper = shallow(buildApp({isLoading: true}));

    const view = wrapper.find('IssueishListView');
    assert.isTrue(view.prop('isLoading'));
    assert.strictEqual(view.prop('total'), 0);
    assert.lengthOf(view.prop('issueishes'), 0);
  });

  it('renders an IssueishListView with issueish results', function() {
    const mockPullRequest = createPullRequestResult({number: 1});

    const onOpenIssueish = sinon.stub();
    const onOpenMore = sinon.stub();

    const wrapper = shallow(buildApp({
      results: [mockPullRequest],
      total: 1,
      onOpenIssueish,
      onOpenMore,
    }));

    const view = wrapper.find('IssueishListView');
    assert.isFalse(view.prop('isLoading'));
    assert.strictEqual(view.prop('total'), 1);
    assert.lengthOf(view.prop('issueishes'), 1);
    assert.deepEqual(view.prop('issueishes'), [
      new Issueish(mockPullRequest),
    ]);

    const payload = Symbol('payload');
    view.prop('onIssueishClick')(payload);
    assert.isTrue(onOpenIssueish.calledWith(payload));

    view.prop('onMoreClick')(payload);
    assert.isTrue(onOpenMore.calledWith(payload));
  });
});
