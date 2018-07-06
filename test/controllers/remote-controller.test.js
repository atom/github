import React from 'react';
import {shallow} from 'enzyme';
import {shell} from 'electron';

import BranchSet from '../../lib/models/branch-set';
import Branch, {nullBranch} from '../../lib/models/branch';
import Remote from '../../lib/models/remote';
import {nullOperationStateObserver} from '../../lib/models/operation-state-observer';
import RemoteController from '../../lib/controllers/remote-controller';
import * as reporterProxy from '../../lib/reporter-proxy';

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
        remotesByName={new Map()}
        branches={branchSet}

        aheadCount={0}
        pushInProgress={false}

        onPushBranch={noop}

        {...props}
      />
    );
  }

  it('increments a counter when onCreatePr is called', async function() {
    const wrapper = shallow(createApp());
    sinon.stub(shell, 'openExternal').resolves();
    sinon.stub(reporterProxy, 'incrementCounter');

    await wrapper.instance().onCreatePr();
    assert.equal(reporterProxy.incrementCounter.callCount, 1);
    assert.deepEqual(reporterProxy.incrementCounter.lastCall.args, ['create-pull-request']);
  });

  it('handles error when onCreatePr fails', async function() {
    const wrapper = shallow(createApp());
    sinon.stub(shell, 'openExternal').rejects(new Error('oh noes'));
    sinon.stub(reporterProxy, 'incrementCounter');

    try {
      await wrapper.instance().onCreatePr();
    } catch (err) {
      assert.equal(err.message, 'oh noes');
    }
    assert.equal(reporterProxy.incrementCounter.callCount, 0);
  });

  it('renders issueish searches', function() {
    const wrapper = shallow(createApp());

    const controller = wrapper.update().find('IssueishSearchesController');
    assert.strictEqual(controller.prop('token'), '1234');
    assert.strictEqual(controller.prop('host'), 'https://api.github.com');
    assert.strictEqual(controller.prop('remote'), remote);
    assert.strictEqual(controller.prop('branches'), branchSet);
  });
});
