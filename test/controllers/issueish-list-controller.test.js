import React from 'react';
import {shallow} from 'enzyme';

import Issueish from '../../lib/models/issueish';
import {IssueishListController} from '../../lib/controllers/issueish-list-controller';

describe('IssueishListController', function() {
  function buildApp(overrideProps = {}) {
    return (
      <IssueishListController
        results={null}
        {...overrideProps}
      />
    );
  }

  it('renders an IssueishListView in a loading state', function() {
    const wrapper = shallow(buildApp());

    const view = wrapper.find('IssueishListView');
    assert.isTrue(view.prop('isLoading'));
    assert.strictEqual(view.prop('total'), 0);
    assert.lengthOf(view.prop('issueishes'), 0);
  });

  it('renders an IssueishListView with issueish results', function() {
    const mockPullRequest = {
      number: 1,
      title: 'One',
      url: 'https://github.com/atom/github/pulls/1',
      author: {
        login: 'smashwilson',
        avatarUrl: 'https://avatars2.githubusercontent.com/u/17565?v=4',
      },
      createdAt: '2018-06-12T14:50:08Z',
      headRefName: 'aw/accordion-solo',
      headRepository: {
        nameWithOwner: 'atom/github',
      },
    };

    const wrapper = shallow(buildApp({
      results: {
        issueCount: 1,
        nodes: [mockPullRequest],
      },
    }));

    const view = wrapper.find('IssueishListView');
    assert.isFalse(view.prop('isLoading'));
    assert.strictEqual(view.prop('total'), 1);
    assert.lengthOf(view.prop('issueishes'), 1);
    assert.deepEqual(view.prop('issueishes'), [
      new Issueish(mockPullRequest),
    ]);
  });
});
