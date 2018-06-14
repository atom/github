import React from 'react';
import {shallow} from 'enzyme';

import IssueishSearchController from '../../lib/controllers/issueish-search-controller';
import Remote from '../../lib/models/remote';
import Branch from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';

describe('IssueishSearchController', function() {
  const origin = new Remote('origin', 'git@github.com:atom/github.git');
  const upstreamMaster = Branch.createRemoteTracking('origin/master', 'origin', 'refs/heads/master');
  const master = new Branch('master', upstreamMaster);

  function buildApp(overloadProps = {}) {
    const branches = new BranchSet();
    branches.add(master);

    return (
      <IssueishSearchController
        token="1234"
        host="https://api.github.com"

        remote={origin}
        branches={branches}
        aheadCount={0}
        pushInProgress={false}

        onCreatePr={() => {}}

        {...overloadProps}
      />
    );
  }

  it('renders an IssueishListContainer for each Search', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.state('searches').length > 0);

    for (const search of wrapper.state('searches')) {
      const list = wrapper.find('IssueishListContainer').filterWhere(w => w.prop('search') === search);
      assert.isTrue(list.exists());
      assert.strictEqual(list.prop('token'), '1234');
      assert.strictEqual(list.prop('host'), 'https://api.github.com');
    }
  });
});
