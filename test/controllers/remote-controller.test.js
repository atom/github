import React from 'react';
import {shallow} from 'enzyme';

import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import Remote from '../../lib/models/remote';
import {nullOperationStateObserver} from '../../lib/models/operation-state-observer';
import RemoteController from '../../lib/controllers/remote-controller';

describe('RemoteController', function() {
  let atomEnv, remote, branchSet, currentBranch;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    remote = new Remote('origin', 'git@github.com:atom/github');
    currentBranch = new Branch('master', nullBranch, nullBranch, true);
    branchSet = new BranchSet();
    branchSet.add(currentBranch);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function createApp(props = {}) {
    const noop = () => {};

    return (
      <RemoteController
        host="https://api.github.com"
        token="1234"

        repository={null}

        remoteOperationObserver={nullOperationStateObserver}
        workspace={atomEnv.workspace}
        remote={remote}
        branches={branchSet}

        aheadCount={0}
        pushInProgress={false}

        onPushBranch={noop}

        {...props}
      />
    );
  }

  it('renders issueish searches', function() {
    const wrapper = shallow(createApp());

    const controller = wrapper.update().find('IssueishSearchController');
    assert.strictEqual(controller.prop('token'), '1234');
    assert.strictEqual(controller.prop('host'), 'https://api.github.com');
    assert.strictEqual(controller.prop('remote'), remote);
    assert.strictEqual(controller.prop('branches'), branchSet);
  });
});
