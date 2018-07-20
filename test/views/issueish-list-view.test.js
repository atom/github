import React from 'react';
import {shallow, mount} from 'enzyme';

import {createPullRequestResult} from '../fixtures/factories/pull-request-result';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import Issueish from '../../lib/models/issueish';
import IssueishListView from '../../lib/views/issueish-list-view';

const allGreen = new Issueish(createPullRequestResult({number: 1, states: ['SUCCESS', 'SUCCESS', 'SUCCESS']}));
const mixed = new Issueish(createPullRequestResult({number: 2, states: ['SUCCESS', 'PENDING', 'FAILURE']}));
const allRed = new Issueish(createPullRequestResult({number: 3, states: ['FAILURE', 'ERROR', 'FAILURE']}));
const noStatus = new Issueish(createPullRequestResult({number: 4, states: null}));

class CustomComponent extends React.Component {
  render() {
    return <div className="custom" />;
  }
}

describe('IssueishListView', function() {
  let branch, branchSet;

  beforeEach(function() {
    branch = new Branch('master', nullBranch, nullBranch, true);
    branchSet = new BranchSet();
    branchSet.add(branch);
  });

  function buildApp(overrideProps = {}) {
    return (
      <IssueishListView
        title="aaa"
        isLoading={true}
        total={0}
        issueishes={[]}

        onCreatePr={() => {}}
        onIssueishClick={() => {}}
        onMoreClick={() => {}}

        {...overrideProps}
      />
    );
  }

  it('sets the accordion title to the search name', function() {
    const wrapper = shallow(buildApp({
      title: 'the search name',
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
    it('uses a custom EmptyComponent if one is provided', function() {
      const wrapper = mount(buildApp({isLoading: false, emptyComponent: CustomComponent}));

      assert.isTrue(wrapper.find('CustomComponent').exists());
    });

    it('renders an error tile if an error is present', function() {
      const error = new Error('error');
      error.rawStack = error.stack;
      const wrapper = mount(buildApp({isLoading: false, error}));

      assert.isTrue(wrapper.find('QueryErrorTile').exists());
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

    it('calls its onMoreClick handler when a "more" component is clicked', function() {
      const issueishes = [allGreen, mixed, allRed];
      const onMoreClick = sinon.stub();
      const wrapper = mount(buildApp({
        isLoading: false,
        total: 4,
        issueishes,
        onMoreClick,
      }));

      wrapper.find('.github-IssueishList-more a').simulate('click');
      assert.isTrue(onMoreClick.called);
    });
  });
});
