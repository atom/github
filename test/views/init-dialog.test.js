import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import InitDialog from '../../lib/views/init-dialog';
import {dialogRequests} from '../../lib/controllers/dialogs-controller';

describe('InitDialog', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrides = {}) {
    return (
      <InitDialog
        workspace={atomEnv.workspace}
        commands={atomEnv.commands}
        request={dialogRequests.init({dirPath: __dirname})}
        inProgress={false}
        {...overrides}
      />
    );
  }

  it('defaults the destination directory to the dirPath parameter', function() {
    const wrapper = shallow(buildApp({
      request: dialogRequests.init({dirPath: path.join('/home/me/src')}),
    }));
    assert.strictEqual(wrapper.find('AtomTextEditor').prop('buffer').getText(), path.join('/home/me/src'));
  });

  it('disables the initialize button when the project path is empty', function() {
    const wrapper = shallow(buildApp({}));

    assert.isTrue(wrapper.find('DialogView').prop('acceptEnabled'));
    wrapper.find('AtomTextEditor').prop('buffer').setText('');
    assert.isFalse(wrapper.find('DialogView').prop('acceptEnabled'));
    wrapper.find('AtomTextEditor').prop('buffer').setText('/some/path');
    assert.isTrue(wrapper.find('DialogView').prop('acceptEnabled'));
  });

  it('calls the request accept method with the chosen path', function() {
    const accept = sinon.spy();
    const request = dialogRequests.init({dirPath: __dirname});
    request.onAccept(accept);

    const wrapper = shallow(buildApp({request}));
    wrapper.find('AtomTextEditor').prop('buffer').setText('/some/path');
    wrapper.find('DialogView').prop('accept')();

    assert.isTrue(accept.calledWith('/some/path'));
  });

  it('calls the request cancel callback', function() {
    const cancel = sinon.spy();
    const request = dialogRequests.init({dirPath: __dirname});
    request.onCancel(cancel);

    const wrapper = shallow(buildApp({request}));

    wrapper.find('DialogView').prop('cancel')();
    assert.isTrue(cancel.called);
  });
});
