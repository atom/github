import React from 'react';
import {shallow} from 'enzyme';

import OpenCommitDialog from '../../lib/views/open-commit-dialog';
import {dialogRequests} from '../../lib/controllers/dialogs-controller';

describe('OpenCommitDialog', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function isValidRef(ref) {
    return Promise.resolve(ref === 'abcd1234');
  }

  function buildApp(overrides = {}) {
    const request = dialogRequests.commit();

    return (
      <OpenCommitDialog
        request={request}
        isValidRef={isValidRef}
        commands={atomEnv.commands}
        {...overrides}
      />
    );
  }

  describe('open button enablement', function() {
    it('disables the open button with no commit ref', function() {
      const wrapper = shallow(buildApp());

      assert.isTrue(wrapper.find('button.icon-commit').prop('disabled'));
    });

    it('enables the open button when commit sha box is populated', function() {
      const wrapper = shallow(buildApp());
      wrapper.find('AtomTextEditor').prop('buffer').setText('abcd1234');

      assert.isFalse(wrapper.find('button.icon-commit').prop('disabled'));
    });
  });

  it('calls the acceptance callback with the entered ref', function() {
    const accept = sinon.spy();
    const request = dialogRequests.commit();
    request.onAccept(accept);

    const wrapper = shallow(buildApp({request}));
    wrapper.find('AtomTextEditor').prop('buffer').setText('abcd1234');
    wrapper.find('button.icon-commit').simulate('click');

    assert.isTrue(accept.calledWith('abcd1234'));
    wrapper.unmount();
  });

  it('calls the cancellation callback', function() {
    const cancel = sinon.spy();
    const request = dialogRequests.commit();
    request.onCancel(cancel);

    const wrapper = shallow(buildApp({request}));

    wrapper.find('button.github-Dialog-cancelButton').simulate('click');
    assert.isTrue(cancel.called);
  });
});
