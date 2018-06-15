import React from 'react';
import {shallow} from 'enzyme';

import Issueish from '../../lib/models/issueish';
import Search from '../../lib/models/search';
import Remote from '../../lib/models/remote';
import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import {BareIssueishListController} from '../../lib/controllers/issueish-list-controller';

describe('IssueishListController', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const branches = new BranchSet();
    branches.add(new Branch('master', nullBranch, nullBranch, true));

    return (
      <BareIssueishListController
        results={null}
        repository={null}

        search={new Search('aaa', 'bbb')}
        workspace={atomEnv.workspace}
        remote={new Remote('origin', 'git@github.com:atom/github.git')}
        branches={branches}
        aheadCount={0}
        pushInProgress={false}
        isLoading={false}

        onCreatePr={() => {}}
        onOpenIssueish={() => {}}
        onOpenSearch={() => {}}

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
      commits: {
        nodes: [
          {
            commit: {
              status: null,
            },
          },
        ],
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
