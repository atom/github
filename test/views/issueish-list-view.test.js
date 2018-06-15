import React from 'react';
import {shallow, mount} from 'enzyme';

import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import Search from '../../lib/models/search';
import Issueish from '../../lib/models/issueish';
import IssueishListView from '../../lib/views/issueish-list-view';

function makeCommit(...states) {
  return {
    nodes: [
      {
        commit: {
          status: {
            contexts: states.map(state => ({state})),
          },
        },
      },
    ],
  };
}

const allGreen = new Issueish({
  number: 1,
  title: 'One',
  url: 'https://github.com/atom/github/pulls/1',
  author: {
    login: 'me',
    avatarUrl: 'https://avatars.githubusercontent.com/u/100?v=24',
  },
  createdAt: '2018-06-12T14:50:08Z',
  headRefName: 'head-ref',
  headRepository: {
    nameWithOwner: 'me/github',
  },
  commits: makeCommit('SUCCESS', 'SUCCESS', 'SUCCESS'),
});

const mixed = new Issueish({
  number: 2,
  title: 'Two',
  url: 'https://github.com/atom/github/pulls/2',
  author: {
    login: 'me',
    avatarUrl: 'https://avatars.githubusercontent.com/u/100?v=24',
  },
  createdAt: '2018-06-12T14:50:08Z',
  headRefName: 'head-ref',
  headRepository: {
    nameWithOwner: 'me/github',
  },
  commits: makeCommit('SUCCESS', 'PENDING', 'FAILURE'),
});

const allRed = new Issueish({
  number: 3,
  title: 'Three',
  url: 'https://github.com/atom/github/pulls/3',
  author: {
    login: 'me',
    avatarUrl: 'https://avatars.githubusercontent.com/u/100?v=24',
  },
  createdAt: '2018-06-12T14:50:08Z',
  headRefName: 'head-ref',
  headRepository: {
    nameWithOwner: 'me/github',
  },
  commits: makeCommit('FAILURE', 'ERROR', 'FAILURE'),
});

const noStatus = new Issueish({
  number: 4,
  title: 'Four',
  url: 'https://github.com/atom/github/pulls/4',
  author: {
    login: 'me',
    avatarUrl: 'https://avatars.githubusercontent.com/u/100?v=24',
  },
  createdAt: '2018-06-12T14:50:08Z',
  headRefName: 'head-ref',
  headRepository: {
    nameWithOwner: 'me/github',
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
});

describe('IssueishListView', function() {
  let origin, branch, branchSet;

  beforeEach(function() {
    origin = new Remote('origin', 'git@github.com:atom/github.git');
    branch = new Branch('master', nullBranch, nullBranch, true);
    branchSet = new BranchSet();
    branchSet.add(branch);
  });

  function buildApp(overrideProps = {}) {
    return (
      <IssueishListView
        search={new Search('aaa', 'bbb')}
        isLoading={true}
        total={0}
        issueishes={[]}

        repository={null}
        remote={origin}
        branches={branchSet}
        aheadCount={0}
        pushInProgress={false}

        onCreatePr={() => {}}
        onIssueishClick={() => {}}
        onMoreClick={() => {}}

        {...overrideProps}
      />
    );
  }

  it('sets the accordion title to the Search name', function() {
    const wrapper = shallow(buildApp({
      search: new Search('the search name', ''),
    }));
    assert.strictEqual(wrapper.find('Accordion').prop('leftTitle'), 'the search name');
  });

  describe('while loading', function() {
    it('sets its accordion as isLoading', function() {
      const wrapper = shallow(buildApp());
      assert.isTrue(wrapper.find('Accordion').prop('isLoading'));
    });

    it('passes an empty result list', function() {
      const wrapper = shallow(buildApp());
      assert.lengthOf(wrapper.find('Accordion').prop('results'), 0);
    });
  });

  describe('with empty results', function() {
    it('uses a custom EmptyComponent if the search requests one', function() {
      const search = Search.forCurrentPR(origin, branch);
      const wrapper = mount(buildApp({isLoading: false, search}));

      assert.isTrue(wrapper.find('CreatePullRequestTile').exists());
    });
  });

  describe('with nonempty results', function() {
    it('passes its results to the accordion', function() {
      const issueishes = [allGreen, mixed, allRed];
      const wrapper = shallow(buildApp({
        isLoading: false,
        total: 3,
        issueishes,
      }));
      assert.deepEqual(wrapper.find('Accordion').prop('results'), issueishes);
    });

    it('renders a check if all status checks are successful', function() {
      const wrapper = mount(buildApp({isLoading: false, total: 1, issueishes: [allGreen]}));
      assert.isTrue(wrapper.find('span.github-IssueishList-item--status').hasClass('icon-check'));
    });

    it('renders an x if all status checks have failed', function() {
      const wrapper = mount(buildApp({isLoading: false, total: 1, issueishes: [allRed]}));
      assert.isTrue(wrapper.find('span.github-IssueishList-item--status').hasClass('icon-x'));
    });

    it('renders a donut chart if status checks are mixed', function() {
      const wrapper = mount(buildApp({isLoading: false, total: 1, issueishes: [mixed]}));

      const chart = wrapper.find('StatusDonutChart');
      assert.strictEqual(chart.prop('pending'), 1);
      assert.strictEqual(chart.prop('failure'), 1);
      assert.strictEqual(chart.prop('success'), 1);
    });

    it('renders nothing with no status checks are present', function() {
      const wrapper = mount(buildApp({isLoading: false, total: 1, issueishes: [noStatus]}));
      assert.isTrue(wrapper.find('span.github-IssueishList-item--status').hasClass('icon-dash'));
    });

    it('calls its onIssueishClick handler when an item is clicked', function() {
      const issueishes = [allGreen, mixed, allRed];
      const onIssueishClick = sinon.stub();
      const wrapper = mount(buildApp({
        isLoading: false,
        total: 3,
        issueishes,
        onIssueishClick,
      }));

      wrapper.find('.github-Accordion-listItem').at(1).simulate('click');
      assert.isTrue(onIssueishClick.calledWith(mixed));
    });
  });
});
