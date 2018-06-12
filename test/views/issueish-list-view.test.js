import React from 'react';
import {shallow} from 'enzyme';

import Search from '../../lib/models/search';
import IssueishListView from '../../lib/views/issueish-list-view';

describe('IssueishListView', function() {
  function buildApp(overrideProps = {}) {
    return (
      <IssueishListView
        search={new Search('aaa', 'bbb')}
        isLoading={true}
        total={0}
        issueishes={[]}
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
