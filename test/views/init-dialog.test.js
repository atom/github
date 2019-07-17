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

    assert.isFalse(wrapper.find('button.icon-repo-create').prop('disabled'));
    wrapper.find('AtomTextEditor').prop('buffer').setText('');
    assert.isTrue(wrapper.find('button.icon-repo-create').prop('disabled'));
    wrapper.find('AtomTextEditor').prop('buffer').setText('/some/path');
    assert.isFalse(wrapper.find('button.icon-repo-create').prop('disabled'));
  });

  it('calls the request accept method with the chosen path', function() {
    const accept = sinon.spy();
    const request = dialogRequests.init({dirPath: __dirname});
    request.onAccept(accept);

    const wrapper = shallow(buildApp({request}));
    wrapper.find('AtomTextEditor').prop('buffer').setText('/some/path');
    wrapper.find('button.icon-repo-create').simulate('click');

    assert.isTrue(accept.calledWith('/some/path'));
  });

  it('displays a spinner while initialization is in progress', function() {
    const wrapper = shallow(buildApp({inProgress: true}));

    assert.isTrue(wrapper.find('AtomTextEditor').prop('readOnly'));
    assert.isTrue(wrapper.find('button.icon-repo-create').prop('disabled'));
    assert.isTrue(wrapper.exists('span.loading-spinner-small'));
  });

  it('displays an error when the accept callback has failed', function() {
    const e = new Error('unfriendly message');
    e.userMessage = 'friendly message';

    const wrapper = shallow(buildApp({error: e}));
    assert.strictEqual(wrapper.find('.error-messages li').text(), 'friendly message');
  });

  it('calls the request cancel callback', function() {
    const cancel = sinon.spy();
    const request = dialogRequests.init({dirPath: __dirname});
    request.onCancel(cancel);

    const wrapper = shallow(buildApp({request}));

    wrapper.find('button.github-Dialog-cancelButton').simulate('click');
    assert.isTrue(cancel.called);
  });
});
