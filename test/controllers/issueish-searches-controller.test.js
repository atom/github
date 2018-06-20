import React from 'react';
import {shallow} from 'enzyme';

import IssueishSearchesController from '../../lib/controllers/issueish-searches-controller';
import Remote from '../../lib/models/remote';
import Branch from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import Issueish from '../../lib/models/issueish';
import {nullOperationStateObserver} from '../../lib/models/operation-state-observer';

describe('IssueishSearchesController', function() {
  let atomEnv;
  const origin = new Remote('origin', 'git@github.com:atom/github.git');
  const upstreamMaster = Branch.createRemoteTracking('origin/master', 'origin', 'refs/heads/master');
  const master = new Branch('master', upstreamMaster);

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overloadProps = {}) {
    const branches = new BranchSet();
    branches.add(master);

    return (
      <IssueishSearchesController
        token="1234"
        host="https://api.github.com"
        repository={null}

        remoteOperationObserver={nullOperationStateObserver}
        workspace={atomEnv.workspace}
        remote={origin}
        remotesByName={new Map()}
        branches={branches}
        aheadCount={0}
        pushInProgress={false}

        onCreatePr={() => {}}

        {...overloadProps}
      />
    );
  }

  it('renders an IssueishSearchContainer for each Search', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.state('searches').length > 0);

    for (const search of wrapper.state('searches')) {
      const list = wrapper.find('IssueishSearchContainer').filterWhere(w => w.prop('search') === search);
      assert.isTrue(list.exists());
      assert.strictEqual(list.prop('token'), '1234');
      assert.strictEqual(list.prop('host'), 'https://api.github.com');
    }
  });

  it('passes a handler to open an issueish pane', async function() {
    sinon.spy(atomEnv.workspace, 'open');

    const wrapper = shallow(buildApp());
    const container = wrapper.find('IssueishSearchContainer').at(0);

    const issueish = new Issueish({
      number: 123,
      title: 'This is the title',
      url: 'https://github.com/atom/github/pulls/123',
      author: {
        login: 'me',
        avatarUrl: 'https://avatars2.githubusercontent.com/u/1234?v=6',
      },
      createdAt: '2018-06-12T14:50:08Z',
      refHeadName: 'feature',
      headRepository: {
        nameWithOwner: 'smashwilson/github',
      },
      commits: {nodes: []},
    });

    await container.prop('onOpenIssueish')(issueish);
    assert.isTrue(
      atomEnv.workspace.open.calledWith(
        'atom-github://issueish/https%3A%2F%2Fapi.github.com/atom/github/123',
        {pending: true, searchAllPanes: true},
      ),
    );
  });
});
