import React from 'react';
import {shallow} from 'enzyme';

import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import Search from '../../lib/models/search';
import IssueishListView from '../../lib/views/issueish-list-view';

describe('IssueishListView', function() {
  function buildApp(overrideProps = {}) {
    const origin = new Remote('origin', 'git@github.com:atom/github.git');
    const branch = new Branch('master', nullBranch, nullBranch, true);
    const branchSet = new BranchSet();
    branchSet.add(branch);

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
    it('uses a custom EmptyComponent if the search requests one');
  });

  describe('with nonempty results', function() {
    it('passes its results to the accordion', function() {
      const issueishes = [Symbol('zero'), Symbol('one'), Symbol('two')];
      const wrapper = shallow(buildApp({
        isLoading: false,
        total: 3,
        issueishes,
      }));
      assert.deepEqual(wrapper.find('Accordion').prop('results'), issueishes);
    });
  });
});
